import { z } from "zod";

export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, "イベント名は必須です")
    .max(100, "イベント名は100文字以内です"),
  memo: z.string().max(500, "メモは500文字以内です").optional().default(""),
  dates: z
    .string()
    .min(1, "候補日は必須です")
    .transform((s) =>
      s
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    )
    .pipe(
      z
        .array(z.string().min(1).max(100))
        .min(1, "候補日が入力されていません")
        .max(30, "候補日は30個までです"),
    ),
});

export const createEventJsonSchema = z.object({
  name: z.string().min(1, "イベント名は必須です").max(100),
  memo: z.string().max(500).optional().default(""),
  dates: z
    .array(z.string().min(1).max(100))
    .min(1, "候補日が入力されていません")
    .max(30),
});

const statusSchema = z.enum(["〇", "△", "×"]);

export const addResponseHtmlSchema = z.object({
  participant_name: z
    .string()
    .min(1, "お名前は必須です")
    .max(50, "お名前は50文字以内です"),
  comment: z
    .string()
    .max(200, "コメントは200文字以内です")
    .optional()
    .default(""),
});

export const addResponseJsonSchema = z.object({
  participant_name: z.string().min(1, "参加者名は必須です").max(50),
  comment: z.string().max(200).optional().default(""),
  statuses: z
    .array(
      z.object({
        candidate_id: z.number().int().positive(),
        status: statusSchema,
      }),
    )
    .min(1),
});

export const loginSchema = z.object({
  password: z.string().min(1, "パスワードは必須です"),
});
