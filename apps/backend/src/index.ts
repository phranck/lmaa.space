import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { adminRoutes } from "./routes/admin.js";
import { publicRoutes } from "./routes/public.js";

const app = new Hono();
const imagePath = process.env.IMAGE_PATH ?? "./uploads";

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://dein.shop", "https://dashboard.dein.shop"]
    : ["http://localhost:5173", "http://localhost:5174"];

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use("*", secureHeaders());
app.use("*", logger());

// Serve uploaded category images
app.get("/uploads/:filename{[^/]+}", async (c) => {
  const filename = c.req.param("filename");
  if (filename.includes("..")) return c.json({ error: { message: "Not found" } }, 404);
  const file = Bun.file(`${imagePath}/${filename}`);
  if (!(await file.exists())) return c.json({ error: { message: "Not found" } }, 404);
  return c.body(await file.arrayBuffer(), 200, { "Content-Type": file.type });
});

app.route("/api", publicRoutes);
app.route("/api/admin", adminRoutes);

app.get("/health", (c) => c.json({ status: "ok" }));

app.notFound((c) => c.json({ error: { message: "Not found" } }, 404));

const port = Number(process.env.PORT ?? 3000);
console.log(`Backend running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
