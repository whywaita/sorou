import { Hono } from "hono";
import { createEventSchema } from "../lib/validation";
import { createDB } from "../db";
import { events, candidates } from "../db/schema";
import { ulid } from "../lib/ulid";
import { TopPage } from "../views/top";
import { EventPage } from "../views/event";
import { EditEventPage } from "../views/edit";
import { NotFoundPage } from "../views/error";
import { PrivacyPage } from "../views/privacy";
import { TermsPage } from "../views/terms";
import { renderOgpImage } from "../lib/ogp";
import { getOrCreateCreatorTokenHash, isCreator } from "../lib/creator";
import { eq, and } from "drizzle-orm";
import type { Event } from "../types";

const web = new Hono<{ Bindings: { DB: D1Database } }>();

function getDomain(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  const host = c.req.header("host") || "localhost:8787";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

function currentUrl(c: {
  req: { header: (name: string) => string | undefined; path: string };
}): string {
  return `${getDomain(c)}${c.req.path}`;
}

// ─── Top page ─────────────────────────────────────────────────────

// GET /
web.get("/", (c) => {
  return c.html(<TopPage currentUrl={currentUrl(c)} />);
});

// POST /events
web.post("/events", async (c) => {
  const body = await c.req.parseBody();
  const result = createEventSchema.safeParse(body);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string;
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return c.html(
      <TopPage
        currentUrl={currentUrl(c)}
        errors={fieldErrors}
        values={{
          name: body.name as string,
          memo: body.memo as string,
          dates: body.dates as string,
        }}
      />,
    );
  }

  const db = createDB(c.env.DB);
  const id = ulid();

  // Issue / reuse a creator token to link this browser to the event
  const { hash: creatorTokenHash } = await getOrCreateCreatorTokenHash(c);

  await db.insert(events).values({
    id,
    name: result.data.name,
    memo: result.data.memo,
    creatorTokenHash,
  });

  for (let i = 0; i < result.data.dates.length; i++) {
    await db.insert(candidates).values({
      eventId: id,
      date: result.data.dates[i],
      sortOrder: i,
    });
  }

  return c.redirect(`/e?id=${id}`);
});

// ─── Event page (query-param based: /e?id=<id>) ──────────────────

// GET /e?id=<id>  — event page
//   ?edit=<name>  → prefill response form for that participant
//   ?action=edit  → show edit event form (creator only)
web.get("/e", async (c) => {
  const id = c.req.query("id");
  if (!id) return c.notFound();

  const action = c.req.query("action");
  const db = createDB(c.env.DB);
  const event = await loadEvent(db, id);
  if (!event) return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);

  // Edit event form (creator)
  if (action === "edit") {
    if (!(await isCreator(c, event.creatorTokenHash))) {
      return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);
    }
    return c.html(
      <EditEventPage
        event={event}
        currentUrl={currentUrl(c)}
        shareUrl={`${getDomain(c)}/e?id=${id}`}
      />,
    );
  }

  // Event display with optional response prefill
  const editParam = c.req.query("edit");
  const editData = editParam ? getEditData(event, editParam) : undefined;
  const creatorFlag = await isCreator(c, event.creatorTokenHash);

  return c.html(
    <EventPage
      event={event}
      shareUrl={`${getDomain(c)}/e?id=${id}`}
      currentUrl={currentUrl(c)}
      edit={editData}
      isCreator={creatorFlag}
    />,
  );
});

// POST /e?id=<id>
//   no action param          → submit response
//   ?action=edit   → update event (creator)
//   ?action=delete → delete event (creator)
web.post("/e", async (c) => {
  const id = c.req.query("id");
  if (!id) return c.notFound();

  const action = c.req.query("action");
  const db = createDB(c.env.DB);

  // ── Delete ──
  if (action === "delete") {
    const event = await loadEvent(db, id);
    if (!event) return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);

    if (!(await isCreator(c, event.creatorTokenHash))) {
      return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);
    }

    // Cascade deletes candidates, responses, response_details
    await db.delete(events).where(eq(events.id, id));
    return c.redirect("/");
  }

  // ── Edit (update) ──
  if (action === "edit") {
    const event = await loadEvent(db, id);
    if (!event) return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);

    if (!(await isCreator(c, event.creatorTokenHash))) {
      return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);
    }

    const body = await c.req.parseBody();
    const result = createEventSchema.safeParse(body);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return c.html(
        <EditEventPage
          event={event}
          currentUrl={currentUrl(c)}
          shareUrl={`${getDomain(c)}/e?id=${id}`}
          errors={fieldErrors}
          values={{
            name: body.name as string,
            memo: body.memo as string,
            dates: body.dates as string,
          }}
        />,
      );
    }

    // Update event name + memo
    await db
      .update(events)
      .set({ name: result.data.name, memo: result.data.memo })
      .where(eq(events.id, id));

    // Replace candidates: delete old responses + candidates → insert new
    const { responses: respTable } = await import("../db/schema");
    await db.delete(respTable).where(eq(respTable.eventId, id));
    await db.delete(candidates).where(eq(candidates.eventId, id));
    for (let i = 0; i < result.data.dates.length; i++) {
      await db.insert(candidates).values({
        eventId: id,
        date: result.data.dates[i],
        sortOrder: i,
      });
    }

    return c.redirect(`/e?id=${id}`);
  }

  // ── Submit response (default) ──
  const body = await c.req.parseBody();
  const event = await loadEvent(db, id);
  if (!event) return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);

  const participantName = (body.participant_name as string)?.trim() ?? "";
  const comment = (body.comment as string)?.trim() ?? "";

  // Validate
  const errors: Record<string, string[]> = {};
  if (!participantName || participantName.length > 50) {
    errors.participant_name = [
      participantName ? "お名前は50文字以内です" : "お名前は必須です",
    ];
  }
  if (comment.length > 200) {
    errors.comment = ["コメントは200文字以内です"];
  }

  // Check statuses
  const statusMap: Record<number, string> = {};
  for (let i = 0; i < event.candidates.length; i++) {
    const val = (body[`status_${i}`] as string) ?? "×";
    if (!["〇", "△", "×"].includes(val)) {
      errors[`status_${i}`] = ["回答が不正です"];
    }
    statusMap[event.candidates[i].id] = val;
  }

  if (Object.keys(errors).length > 0) {
    const creatorFlag = await isCreator(c, event.creatorTokenHash);
    return c.html(
      <EventPage
        event={event}
        shareUrl={`${getDomain(c)}/e?id=${id}`}
        currentUrl={currentUrl(c)}
        errors={errors}
        edit={{
          name: participantName,
          comment,
          statuses: statusMap,
        }}
        isCreator={creatorFlag}
      />,
    );
  }

  // Upsert response
  const { responses: respTable, responseDetails: detailTable } =
    await import("../db/schema");
  const existing = await db
    .select()
    .from(respTable)
    .where(
      and(
        eq(respTable.eventId, id),
        eq(respTable.participantName, participantName),
      ),
    )
    .limit(1);

  let responseId: number;
  if (existing.length > 0) {
    responseId = existing[0].id;
    await db.delete(detailTable).where(eq(detailTable.responseId, responseId));
  } else {
    const inserted = await db
      .insert(respTable)
      .values({
        eventId: id,
        participantName,
        comment,
      })
      .returning({ id: respTable.id });
    responseId = inserted[0].id;
  }

  for (const [candId, status] of Object.entries(statusMap)) {
    await db.insert(detailTable).values({
      responseId,
      candidateId: parseInt(candId),
      status: status as "〇" | "△" | "×",
    });
  }

  return c.redirect(`/e?id=${id}`);
});

// ─── OGP images ───────────────────────────────────────────────────

// GET /ogp.png — default OGP image (site name + tagline)
web.get("/ogp.png", async () => {
  return renderOgpImage();
});

// GET /e/ogp.png?id=<id> — dynamic OGP image per event
web.get("/e/ogp.png", async (c) => {
  const id = c.req.query("id");
  if (!id) {
    // No event ID → return default OGP
    return renderOgpImage();
  }

  const db = createDB(c.env.DB);
  const event = await loadEvent(db, id);
  if (!event) return c.notFound();

  return renderOgpImage({ title: event.name, description: event.memo });
});

// ─── Static pages ─────────────────────────────────────────────────

// GET /privacy
web.get("/privacy", (c) => {
  return c.html(<PrivacyPage currentUrl={currentUrl(c)} />);
});

// GET /terms
web.get("/terms", (c) => {
  return c.html(<TermsPage currentUrl={currentUrl(c)} />);
});

// ─── Legacy redirects (old path-based URLs → new query-based) ─────

// GET /e/:id
web.get("/e/:id", (c) => {
  const id = c.req.param("id");
  // Preserve existing query params (e.g. ?edit=<name>)
  const qs = new URL(c.req.url).search;
  const separator = qs ? "&" : "";
  return c.redirect(`/e?id=${id}${separator}${qs.replace(/^\?/, "")}`, 301);
});

// GET /e/:id/ogp.png
web.get("/e/:id/ogp.png", (c) => {
  return c.redirect(`/e/ogp.png?id=${c.req.param("id")}`, 301);
});

// GET /e/:id/edit
web.get("/e/:id/edit", (c) => {
  return c.redirect(`/e?id=${c.req.param("id")}&action=edit`, 301);
});

// POST /e/:id/responses
web.post("/e/:id/responses", (c) => {
  return c.redirect(`/e?id=${c.req.param("id")}`, 307);
});

// POST /e/:id/edit
web.post("/e/:id/edit", (c) => {
  return c.redirect(`/e?id=${c.req.param("id")}&action=edit`, 307);
});

// POST /e/:id/delete
web.post("/e/:id/delete", (c) => {
  return c.redirect(`/e?id=${c.req.param("id")}&action=delete`, 307);
});

// ─── Helpers ──────────────────────────────────────────────────────

export async function loadEvent(
  db: ReturnType<typeof createDB>,
  id: string,
): Promise<Event | null> {
  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (eventRows.length === 0) return null;

  const ev = eventRows[0];
  const candRows = await db
    .select()
    .from(candidates)
    .where(eq(candidates.eventId, id))
    .orderBy(candidates.sortOrder);

  const { responses: respTable, responseDetails: detailTable } =
    await import("../db/schema");

  const respRows = await db
    .select()
    .from(respTable)
    .where(eq(respTable.eventId, id));

  const result: Event = {
    id: ev.id,
    name: ev.name,
    memo: ev.memo,
    creatorTokenHash: ev.creatorTokenHash,
    candidates: candRows.map((c) => ({
      id: c.id,
      date: c.date,
      sortOrder: c.sortOrder,
    })),
    responses: [],
    createdAt: ev.createdAt,
  };

  for (const r of respRows) {
    const details = await db
      .select()
      .from(detailTable)
      .where(eq(detailTable.responseId, r.id));
    result.responses.push({
      id: r.id,
      participantName: r.participantName,
      comment: r.comment,
      statuses: details.map((d) => ({
        candidateId: d.candidateId,
        status: d.status as "〇" | "△" | "×",
      })),
      createdAt: r.createdAt,
    });
  }

  return result;
}

function getEditData(
  event: Event,
  participantName: string,
): { name: string; comment: string; statuses: Record<number, string> } {
  const resp = event.responses.find(
    (r) => r.participantName === participantName,
  );
  if (!resp) {
    return { name: participantName, comment: "", statuses: {} };
  }
  const statuses: Record<number, string> = {};
  for (const s of resp.statuses) {
    statuses[s.candidateId] = s.status;
  }
  return { name: resp.participantName, comment: resp.comment, statuses };
}

export default web;
