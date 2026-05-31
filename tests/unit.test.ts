import { describe, it, expect } from "vitest";
import { ulid } from "../src/lib/ulid";

describe("ulid", () => {
  it("generates 26-character ULID", () => {
    const id = ulid();
    expect(id).toHaveLength(26);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => ulid()));
    expect(ids.size).toBe(100);
  });

  it("uses Crockford Base32 characters", () => {
    const id = ulid();
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
  });
});

describe("validation", () => {
  it("createEventSchema validates correctly", async () => {
    const { createEventSchema } = await import("../src/lib/validation");
    const valid = createEventSchema.safeParse({
      name: "テスト",
      dates: "6/15\n6/16\n6/17",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.dates).toHaveLength(3);
    }
  });

  it("createEventSchema rejects empty name", async () => {
    const { createEventSchema } = await import("../src/lib/validation");
    const result = createEventSchema.safeParse({ name: "", dates: "6/15" });
    expect(result.success).toBe(false);
  });

  it("createEventJsonSchema validates correctly", async () => {
    const { createEventJsonSchema } = await import("../src/lib/validation");
    const valid = createEventJsonSchema.safeParse({
      name: "テスト",
      dates: ["6/15", "6/16"],
    });
    expect(valid.success).toBe(true);
  });

  it("addResponseJsonSchema validates statuses", async () => {
    const { addResponseJsonSchema } = await import("../src/lib/validation");
    const valid = addResponseJsonSchema.safeParse({
      participant_name: "whytaro",
      statuses: [{ candidate_id: 1, status: "〇" }],
    });
    expect(valid.success).toBe(true);
  });

  it("addResponseJsonSchema rejects invalid status", async () => {
    const { addResponseJsonSchema } = await import("../src/lib/validation");
    const result = addResponseJsonSchema.safeParse({
      participant_name: "whytaro",
      statuses: [{ candidate_id: 1, status: "invalid" }],
    });
    expect(result.success).toBe(false);
  });
});
