import { Hono } from "hono";
import { createEventSchema } from "../lib/validation";
import { createDB } from "../db";
import { events, candidates } from "../db/schema";
import { ulid } from "../lib/ulid";
import { TopPage } from "../views/top";
import { EventPage } from "../views/event";
import { NotFoundPage } from "../views/error";
import { eq } from "drizzle-orm";
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

  await db.insert(events).values({
    id,
    name: result.data.name,
    memo: result.data.memo,
  });

  for (let i = 0; i < result.data.dates.length; i++) {
    await db.insert(candidates).values({
      eventId: id,
      date: result.data.dates[i],
      sortOrder: i,
    });
  }

  return c.redirect(`/e/${id}`);
});

// GET /e/:id
web.get("/e/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDB(c.env.DB);

  const event = await loadEvent(db, id);
  if (!event) return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);

  const editParam = c.req.query("edit");
  const editData = editParam ? getEditData(event, editParam) : undefined;

  return c.html(
    <EventPage
      event={event}
      shareUrl={`${getDomain(c)}/e/${id}`}
      currentUrl={currentUrl(c)}
      edit={editData}
    />,
  );
});

// GET /e/:id/ogp.svg — dynamic OGP image per event
web.get("/e/:id/ogp.svg", async (c) => {
  const id = c.req.param("id");
  const db = createDB(c.env.DB);

  const event = await loadEvent(db, id);
  if (!event) return c.notFound();

  const svg = ogpSvg(event.name);
  return c.body(svg, 200, { "Content-Type": "image/svg+xml; charset=utf-8" });
});

// POST /e/:id/responses
web.post("/e/:id/responses", async (c) => {
  const eventId = c.req.param("id");
  const body = await c.req.parseBody();
  const db = createDB(c.env.DB);

  const event = await loadEvent(db, eventId);
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
    return c.html(
      <EventPage
        event={event}
        shareUrl={`${getDomain(c)}/e/${eventId}`}
        currentUrl={currentUrl(c)}
        errors={errors}
        edit={{
          name: participantName,
          comment,
          statuses: statusMap,
        }}
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
      eq(respTable.eventId, eventId) &&
        eq(respTable.participantName, participantName),
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
        eventId,
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

  return c.redirect(`/e/${eventId}`);
});

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

// Dynamic OGP SVG generator
function ogpSvg(eventName: string): string {
  const escapedName = escapeXml(eventName);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0fdf4" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#059669"/>
  <rect x="80" y="160" width="1040" height="310" rx="16" fill="#f0fdf4" stroke="#d1fae5" stroke-width="2"/>
  <g transform="translate(160, 260)">
    <rect x="0" y="8" width="80" height="72" rx="6" fill="none" stroke="#059669" stroke-width="4"/>
    <line x1="0" y1="30" x2="80" y2="30" stroke="#059669" stroke-width="4"/>
    <line x1="20" y1="0" x2="20" y2="14" stroke="#059669" stroke-width="4" stroke-linecap="round"/>
    <line x1="60" y1="0" x2="60" y2="14" stroke="#059669" stroke-width="4" stroke-linecap="round"/>
    <circle cx="40" cy="52" r="16" fill="#059669"/>
    <path d="M32 52 L38 58 L48 46" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="280" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="#059669">sorou</text>
  <text x="280" y="350" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="600" fill="#334155">${escapedName}</text>
  <text x="280" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#64748b">シンプルな日程調整ツール</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default web;
