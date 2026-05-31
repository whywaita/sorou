import { Hono } from "hono";
import { csrf, rateLimit } from "./lib/middleware";
import web from "./routes/web";
import api from "./routes/api";
import admin from "./routes/admin";

const app = new Hono<{ Bindings: { DB: D1Database; ADMIN_PASSWORD: string } }>();

// Make ADMIN_PASSWORD available globally
app.use("*", async (c, next) => {
  (globalThis as any).ADMIN_PASSWORD = c.env.ADMIN_PASSWORD ?? "";
  await next();
});

// CSRF protection for all routes
app.use("*", csrf);

// Rate limiting for POST endpoints
app.use("/events", rateLimit(10, 60));
app.use("/api/events", rateLimit(10, 60));
app.use("/e/:id/responses", rateLimit(30, 60));
app.use("/api/events/:id/responses", rateLimit(30, 60));
app.use("/admin/login", rateLimit(5, 60));

// Routes
app.route("/", web);
app.route("/api", api);
app.route("/", admin);

// 404 fallback
app.notFound((c) => c.json({ error: "not_found", message: "Not Found" }, 404));

export default app;
