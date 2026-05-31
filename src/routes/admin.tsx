import { Hono } from "hono";
import { createDB } from "../db";
import { events, candidates, responses } from "../db/schema";
import { eq, like } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  isAdminEnabled,
  isAdmin,
  verifyPassword,
  setSessionCookie,
} from "../lib/session";
import { AdminLoginPage, AdminEventList } from "../views/admin";

const admin = new Hono<{ Bindings: { DB: D1Database } }>();

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
    return c.html(<AdminLoginPage />);
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
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return c.html(<AdminEventList events={list} query={query || undefined} />);
});

// POST /admin/login
admin.post("/admin/login", async (c) => {
  const body = await c.req.parseBody();
  const password = (body.password as string)?.trim() ?? "";

  if (!password || !(await verifyPassword(password))) {
    return c.html(
      <AdminLoginPage error="パスワードが違います" />
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

export default admin;
