import { Hono } from "hono";
import { createDB } from "../db";
import { events, candidates, responses } from "../db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  isAdminEnabled,
  isAdmin,
  verifyPassword,
  setSessionCookie,
} from "../lib/session";
import { createEventSchema } from "../lib/validation";
import { AdminLoginPage, AdminEventList } from "../views/admin";
import { EditEventPage } from "../views/edit";
import { NotFoundPage } from "../views/error";
import { loadEvent } from "./web";

const admin = new Hono<{ Bindings: { DB: D1Database } }>();

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

// Middleware: check admin enabled
admin.use("/admin/*", async (c, next) => {
  if (!isAdminEnabled()) {
    return c.notFound();
  }
  await next();
});

// GET /admin
admin.get("/admin", async (c) => {
  if (!(await isAdmin(c))) {
    return c.html(<AdminLoginPage currentUrl={currentUrl(c)} />);
  }

  const db = createDB(c.env.DB);
  const query = c.req.query("q")?.trim() || "";

  let eventRows;
  if (query) {
    // Client-side filter: fetch all and filter locally
    eventRows = await db.select().from(events).all();
    eventRows = eventRows.filter((e) => e.name.includes(query));
  } else {
    eventRows = await db
      .select()
      .from(events)
      .orderBy(sql`${events.createdAt} DESC`)
      .all();
  }

  const list = [];
  for (const ev of eventRows) {
    const candCount = await db
      .select()
      .from(candidates)
      .where(eq(candidates.eventId, ev.id))
      .all()
      .then((r) => r.length);
    const respCount = await db
      .select()
      .from(responses)
      .where(eq(responses.eventId, ev.id))
      .all()
      .then((r) => r.length);
    list.push({
      id: ev.id,
      name: ev.name,
      memo: ev.memo,
      createdAt: ev.createdAt,
      candidateCount: candCount,
      responseCount: respCount,
    });
  }

  // Sort by created_at desc
  list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return c.html(
    <AdminEventList
      currentUrl={currentUrl(c)}
      events={list}
      query={query || undefined}
    />,
  );
});

// POST /admin/login
admin.post("/admin/login", async (c) => {
  const body = await c.req.parseBody();
  const password = (body.password as string)?.trim() ?? "";

  if (!password || !(await verifyPassword(password))) {
    return c.html(
      <AdminLoginPage
        currentUrl={currentUrl(c)}
        error="パスワードが違います"
      />,
    );
  }

  setSessionCookie(c);
  return c.redirect("/admin");
});

// POST /admin/events/:id/delete
admin.post("/admin/events/:id/delete", async (c) => {
  if (!(await isAdmin(c))) {
    return c.redirect("/admin");
  }

  const eventId = c.req.param("id");
  const db = createDB(c.env.DB);

  // Check exists
  const ev = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (ev.length === 0) {
    return c.notFound();
  }

  // Delete (CASCADE handles related rows)
  await db.delete(events).where(eq(events.id, eventId));

  return c.redirect("/admin");
});

// GET /admin/events/:id/edit — admin event edit form
admin.get("/admin/events/:id/edit", async (c) => {
  if (!(await isAdmin(c))) {
    return c.redirect("/admin");
  }

  const eventId = c.req.param("id");
  const db = createDB(c.env.DB);
  const event = await loadEvent(db, eventId);
  if (!event) return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);

  return c.html(
    <EditEventPage
      event={event}
      currentUrl={currentUrl(c)}
      shareUrl={`${getDomain(c)}/e?id=${eventId}`}
      isAdmin
    />,
  );
});

// POST /admin/events/:id/edit — admin update event
admin.post("/admin/events/:id/edit", async (c) => {
  if (!(await isAdmin(c))) {
    return c.redirect("/admin");
  }

  const eventId = c.req.param("id");
  const body = await c.req.parseBody();
  const db = createDB(c.env.DB);

  const event = await loadEvent(db, eventId);
  if (!event) return c.html(<NotFoundPage currentUrl={currentUrl(c)} />, 404);

  // Validate
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
        shareUrl={`${getDomain(c)}/e?id=${eventId}`}
        errors={fieldErrors}
        values={{
          name: body.name as string,
          memo: body.memo as string,
          dates: body.dates as string,
        }}
        isAdmin
      />,
    );
  }

  // Update event name + memo
  await db
    .update(events)
    .set({ name: result.data.name, memo: result.data.memo })
    .where(eq(events.id, eventId));

  // Replace candidates: delete old responses + candidates → insert new
  await db.delete(responses).where(eq(responses.eventId, eventId));
  await db.delete(candidates).where(eq(candidates.eventId, eventId));
  for (let i = 0; i < result.data.dates.length; i++) {
    await db.insert(candidates).values({
      eventId,
      date: result.data.dates[i],
      sortOrder: i,
    });
  }

  return c.redirect("/admin");
});

export default admin;
