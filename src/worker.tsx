import { Hono } from "hono";
import { EVENT_NAMES, PRODUCT, type EventName } from "./config/product";
import { DICTIONARY_META } from "./generated/dictionary";
import { securityHeaders } from "./middleware/security";
import { HomePage, NotFoundPage, PrivacyPage, SourcesPage } from "./ui/pages";

type RateLimiter = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
  WRITE_LIMITER: RateLimiter;
};

type Variables = {
  requestId: string;
};

export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (context, next) => {
  context.set("requestId", crypto.randomUUID());
  await next();
  context.header("X-Request-Id", context.get("requestId"));
});
app.use("*", securityHeaders);

app.get("/", (context) => {
  context.header("Cache-Control", "public, max-age=300");
  return context.html(<HomePage />);
});

app.get("/privacy", (context) => {
  context.header("Cache-Control", "public, max-age=3600");
  return context.html(<PrivacyPage />);
});

app.get("/sources", (context) => {
  context.header("Cache-Control", "public, max-age=3600");
  return context.html(<SourcesPage />);
});

app.get("/healthz", (context) =>
  context.json({
    ok: true,
    dictionaryDate: DICTIONARY_META.date,
    entries: DICTIONARY_META.entries,
  }),
);

app.get("/sitemap.xml", (context) => {
  context.header("Content-Type", "application/xml; charset=utf-8");
  context.header("Cache-Control", "public, max-age=86400");
  return context.body(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${PRODUCT.origin}/</loc></url>
  <url><loc>${PRODUCT.origin}/sources</loc></url>
  <url><loc>${PRODUCT.origin}/privacy</loc></url>
</urlset>`);
});

function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && EVENT_NAMES.includes(value as EventName);
}

async function hashClientId(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

app.post("/api/events", async (context) => {
  const origin = context.req.header("Origin");
  const requestOrigin = new URL(context.req.url).origin;
  const fetchSite = context.req.header("Sec-Fetch-Site");
  if ((origin && origin !== requestOrigin) || fetchSite === "cross-site") {
    return context.json({ error: "forbidden" }, 403);
  }

  const contentType = context.req.header("Content-Type") ?? "";
  const contentLength = Number(context.req.header("Content-Length") ?? "0");
  if (!contentType.startsWith("application/json") || contentLength > 256) {
    return context.json({ error: "invalid_request" }, 400);
  }

  const clientId = context.req.header("X-Tango-Client") ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)
  ) {
    return context.json({ error: "invalid_client" }, 400);
  }

  const rate = await context.env.WRITE_LIMITER.limit({ key: clientId });
  if (!rate.success) {
    return context.json({ error: "rate_limited" }, 429);
  }

  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    return context.json({ error: "invalid_json" }, 400);
  }
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("event" in body) ||
    !isEventName(body.event)
  ) {
    return context.json({ error: "invalid_event" }, 400);
  }

  const userHash = await hashClientId(clientId);
  await context.env.DB.prepare("INSERT INTO events (user_hash, event_name) VALUES (?, ?)")
    .bind(userHash, body.event)
    .run();

  return context.body(null, 202);
});

app.notFound((context) => context.html(<NotFoundPage />, 404));

async function scheduled(_controller: ScheduledController, env: Bindings) {
  await env.DB.prepare(
    `DELETE FROM events WHERE occurred_at < datetime('now', '-${PRODUCT.dataRetentionDays} days')`,
  ).run();
}

export default {
  fetch: (request: Request, env: Bindings, executionContext: ExecutionContext) =>
    app.fetch(request, env, executionContext),
  scheduled,
};
