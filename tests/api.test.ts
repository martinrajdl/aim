import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { briefs } from "./fixtures";
import { defaultView } from "../lib/view-config";
vi.mock("server-only", () => ({}));
vi.mock("../lib/server/brief-repository", () => ({
  getBrief: async (key: string) => briefs.find((b) => b.key === key),
}));
vi.mock("../lib/server/customize", () => ({ customize: vi.fn() }));
import { customize } from "../lib/server/customize";
import { POST } from "../app/api/customize/route";
const body = () => ({
  requestId: crypto.randomUUID(),
  revision: 3,
  request: "Only new",
  config: defaultView,
  sources: briefs.map((b) => ({ key: b.key, fingerprint: b.fingerprint })),
});
const req = (value: unknown, origin = "http://127.0.0.1:3000") =>
  new Request("http://localhost:3000/api/customize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "127.0.0.1:3000",
      Origin: origin,
    },
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.stubEnv("AZURE_OPENAI_API_KEY", "test-only-placeholder");
  vi.mocked(customize).mockReset();
});
afterEach(() => vi.unstubAllEnvs());
it("accepts the actual same-origin browser host even when Next normalizes its internal URL", async () => {
  vi.mocked(customize).mockResolvedValue({
    outcome: "clarify",
    reason: "ambiguous_request",
    config: null,
  });
  const request = body(),
    response = await POST(req(request));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.requestId).toBe(request.requestId);
  expect(result.revision).toBe(3);
});
it("rejects cross-origin browser requests before model access", async () => {
  expect((await POST(req(body(), "https://example.com"))).status).toBe(403);
  expect(customize).not.toHaveBeenCalled();
});
it("rejects invalid origins without throwing", async () => {
  expect((await POST(req(body(), "not-an-origin"))).status).toBe(403);
  expect(customize).not.toHaveBeenCalled();
});
it("does not mistake an internal Next URL for a local incoming host", async () => {
  vi.stubEnv("AIM_CUSTOMIZE_TOKEN", "");
  const request = req(body(), "https://brief.example.com");
  request.headers.set("host", "brief.example.com");
  expect((await POST(request)).status).toBe(403);
  expect(customize).not.toHaveBeenCalled();
});
it("requires the model environment without breaking the reading API", async () => {
  vi.stubEnv("AZURE_OPENAI_API_KEY", "");
  expect((await POST(req(body()))).status).toBe(503);
  expect(customize).not.toHaveBeenCalled();
});
it("rejects stale fingerprints before model access", async () => {
  const b = body();
  b.sources[0].fingerprint = "stale";
  expect((await POST(req(b))).status).toBe(409);
  expect(customize).not.toHaveBeenCalled();
});
it("handles provider failure without leaking raw errors", async () => {
  vi.mocked(customize).mockRejectedValue(Error("private provider diagnostic"));
  const response = await POST(req(body()));
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("private provider diagnostic");
});
it("handles timeout and invalid requests", async () => {
  vi.mocked(customize).mockRejectedValue(
    new DOMException("timeout", "TimeoutError"),
  );
  expect((await POST(req(body()))).status).toBe(504);
  expect((await POST(req({ ...body(), request: "" }))).status).toBe(400);
});

it("rejects foreign source selections before calling the provider", async () => {
  const request = {
    ...body(),
    config: { ...defaultView, itemIds: ["foreign-id"] },
  };
  expect((await POST(req(request))).status).toBe(409);
  expect(customize).not.toHaveBeenCalled();
});
it("requires all three unique sources for the global profile", async () => {
  const request = body();
  expect(
    (await POST(req({ ...request, sources: request.sources.slice(0, 1) })))
      .status,
  ).toBe(400);
  expect(
    (
      await POST(
        req({
          ...request,
          sources: [request.sources[0], request.sources[0], request.sources[2]],
        }),
      )
    ).status,
  ).toBe(400);
  expect(customize).not.toHaveBeenCalled();
});
it("passes one global configuration and all source catalogs into customization", async () => {
  vi.mocked(customize).mockResolvedValue({
    outcome: "apply",
    reason: "configured",
    config: { ...defaultView, density: "compact" },
  });
  const request = body();
  const response = await POST(req(request));
  expect(response.status).toBe(200);
  expect(vi.mocked(customize).mock.calls[0][0].config).toEqual(defaultView);
  expect(vi.mocked(customize).mock.calls[0][1].map((b) => b.key)).toEqual(
    briefs.map((b) => b.key),
  );
  expect((await response.json()).outcome.config.density).toBe("compact");
});
