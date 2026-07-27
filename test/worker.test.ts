import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { app, type Bindings } from "../src/worker";

type DatabaseCall = {
  sql: string;
  values: unknown[];
};

function makeEnvironment() {
  const calls: DatabaseCall[] = [];
  const database = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              calls.push({ sql, values });
              return { success: true };
            },
          };
        },
        async run() {
          calls.push({ sql, values: [] });
          return { success: true };
        },
      };
    },
  };
  const environment = {
    ASSETS: {},
    DB: database,
    WRITE_LIMITER: {
      async limit() {
        return { success: true };
      },
    },
  } as unknown as Bindings;
  return { environment, calls };
}

describe("product pages", () => {
  it("renders the compact work surface with attribution and external assets", async () => {
    const { environment } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/",
      {},
      environment,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("script-src 'self'");
    expect(html).toContain("Tango Orbit");
    expect(html).toContain("検索候補");
    expect(html).toContain("JMdict / EDRDG");
    expect(html).toContain('src="/app.js"');
    expect(html).not.toContain("style=");
    expect(html).not.toContain("30日");
    expect(html).not.toContain("MVP");
  });

  it("renders source and privacy disclosures", async () => {
    const { environment } = makeEnvironment();
    const [sources, privacy] = await Promise.all([
      app.request("https://tango-orbit.yusuke8h.workers.dev/sources", {}, environment),
      app.request("https://tango-orbit.yusuke8h.workers.dev/privacy", {}, environment),
    ]);
    const [sourceHtml, privacyHtml] = await Promise.all([sources.text(), privacy.text()]);

    expect(sourceHtml).toContain("CC BY-SA 4.0");
    expect(sourceHtml).toContain("22,620");
    expect(privacyHtml).toContain("検索語");
    expect(privacyHtml).toContain("35日");
  });

  it("reports the dictionary version in health", async () => {
    const { environment } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/healthz",
      {},
      environment,
    );
    expect(await response.json()).toEqual({
      ok: true,
      dictionaryDate: "2026-07-20",
      entries: 22620,
    });
  });

  it("marks unknown pages noindex", async () => {
    const { environment } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/missing",
      {},
      environment,
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('<meta name="robots" content="noindex"/>');
  });
});

describe("content-free telemetry", () => {
  const clientId = "f14a42ba-8f62-4548-bfd4-c53c5fa7cc2f";

  it("stores an allowlisted event with a hashed client id", async () => {
    const { environment, calls } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/api/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://tango-orbit.yusuke8h.workers.dev",
          "X-Tango-Client": clientId,
        },
        body: JSON.stringify({ event: "searched" }),
      },
      environment,
    );

    expect(response.status).toBe(202);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.values[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(calls[0]?.values[0]).not.toBe(clientId);
    expect(calls[0]?.values[1]).toBe("searched");
  });

  it("rejects extra fields so query text cannot be recorded", async () => {
    const { environment, calls } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/api/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tango-Client": clientId,
        },
        body: JSON.stringify({ event: "searched", query: "private" }),
      },
      environment,
    );

    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("rejects cross-site writes", async () => {
    const { environment, calls } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/api/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://example.com",
          "X-Tango-Client": clientId,
        },
        body: JSON.stringify({ event: "visited" }),
      },
      environment,
    );

    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("rejects unknown events", async () => {
    const { environment, calls } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/api/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tango-Client": clientId,
        },
        body: JSON.stringify({ event: "query_text" }),
      },
      environment,
    );

    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("rejects malformed client identifiers", async () => {
    const { environment, calls } = makeEnvironment();
    const response = await app.request(
      "https://tango-orbit.yusuke8h.workers.dev/api/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tango-Client": "------------------------------------",
        },
        body: JSON.stringify({ event: "visited" }),
      },
      environment,
    );

    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("generated dictionary", () => {
  it("contains a checksum-verified CC BY-SA source and all declared words", async () => {
    const dictionary = JSON.parse(
      await readFile(new URL("../public/dictionary.json", import.meta.url), "utf8"),
    );

    expect(dictionary.entries).toBe(dictionary.words.length);
    expect(dictionary.entries).toBeGreaterThan(20_000);
    expect(dictionary.source.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(dictionary.source.licence).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
  });
});
