import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createEventJsonSchema, addResponseJsonSchema } from "../lib/validation";
import { createDB } from "../db";
import { events, candidates, responses, responseDetails } from "../db/schema";
import { ulid } from "../lib/ulid";
import { eq, and } from "drizzle-orm";
import type { Event } from "../types";

const api = new Hono<{ Bindings: { DB: D1Database } }>();

function getDomain(c: { req: { header: (name: string) => string | undefined } }): string {
  const host = c.req.header("host") || "localhost:8787";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

// POST /api/events
api.post("/events", zValidator("json", createEventJsonSchema), async (c) => {
  const data = c.req.valid("json");
  const db = createDB(c.env.DB);
  const id = ulid();

  await db.insert(events).values({
    id,
    name: data.name,
    memo: data.memo,
  });

  for (let i = 0; i < data.dates.length; i++) {
    await db.insert(candidates).values({
      eventId: id,
      date: data.dates[i],
      sortOrder: i,
    });
  }

  // Fetch back for response
  const event = await loadEvent(db, id);
  const domain = getDomain(c);

  return c.json(
    {
      id: event!.id,
      name: event!.name,
      memo: event!.memo,
      dates: event!.candidates.map((c) => ({ id: c.id, date: c.date })),
      responses: [],
      created_at: event!.createdAt,
      url: `${domain}/e/${id}`,
    },
    201
  );
});

// GET /api/events/:id
api.get("/events/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDB(c.env.DB);
  const event = await loadEvent(db, id);
  if (!event) {
    return c.json({ error: "not_found", message: "イベントが見つかりません" }, 404);
  }

  const domain = getDomain(c);
  return c.json({
    id: event.id,
    name: event.name,
    memo: event.memo,
    dates: event.candidates.map((c) => ({ id: c.id, date: c.date })),
    responses: event.responses.map((r) => ({
      id: r.id,
      participant_name: r.participantName,
      comment: r.comment,
      statuses: r.statuses.map((s) => ({
        candidate_id: s.candidateId,
        status: s.status,
      })),
      created_at: r.createdAt,
    })),
    created_at: event.createdAt,
    url: `${domain}/e/${id}`,
  });
});

// POST /api/events/:id/responses
api.post(
  "/events/:id/responses",
  zValidator("json", addResponseJsonSchema),
  async (c) => {
    const eventId = c.req.param("id");
    const data = c.req.valid("json");
    const db = createDB(c.env.DB);

    // Check event exists
    const eventRows = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (eventRows.length === 0) {
      return c.json({ error: "not_found", message: "イベントが見つかりません" }, 404);
    }

    // Check all candidate_ids are valid
    const candRows = await db
      .select()
      .from(candidates)
      .where(eq(candidates.eventId, eventId));
    const validIds = new Set(candRows.map((c) => c.id));
    for (const s of data.statuses) {
      if (!validIds.has(s.candidate_id)) {
        return c.json(
          {
            error: "validation_error",
            message: "入力内容を確認してください",
            details: { statuses: [`候補日ID ${s.candidate_id} は存在しません`] },
          },
          400
        );
      }
    }

    // Upsert response
    const existing = await db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.eventId, eventId),
          eq(responses.participantName, data.participant_name)
        )
      )
      .limit(1);

    let responseId: number;
    let updated = false;
    if (existing.length > 0) {
      responseId = existing[0].id;
      await db.delete(responseDetails).where(eq(responseDetails.responseId, responseId));
      updated = true;
    } else {
      const inserted = await db
        .insert(responses)
        .values({
          eventId,
          participantName: data.participant_name,
          comment: data.comment,
        })
        .returning({ id: responses.id });
      responseId = inserted[0].id;
    }

    for (const s of data.statuses) {
      await db.insert(responseDetails).values({
        responseId,
        candidateId: s.candidate_id,
        status: s.status,
      });
    }

    return c.json({
      id: responseId,
      participant_name: data.participant_name,
      comment: data.comment,
      statuses: data.statuses.map((s) => ({
        candidate_id: s.candidate_id,
        status: s.status,
      })),
      created_at: existing.length > 0 ? existing[0].createdAt : new Date().toISOString().split(".")[0] + "Z",
      updated,
    });
  }
);

async function loadEvent(
  db: ReturnType<typeof createDB>,
  id: string
): Promise<Event | null> {
  const eventRows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (eventRows.length === 0) return null;

  const ev = eventRows[0];
  const candRows = await db
    .select()
    .from(candidates)
    .where(eq(candidates.eventId, id))
    .orderBy(candidates.sortOrder);

  const respRows = await db
    .select()
    .from(responses)
    .where(eq(responses.eventId, id));

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
      .from(responseDetails)
      .where(eq(responseDetails.responseId, r.id));
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

export default api;
