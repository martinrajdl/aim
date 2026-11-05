// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { useWorkspace } from "../lib/use-workspace";
import { raw, briefs } from "./fixtures";
import { defaultView, orderedItems, type ViewConfig } from "../lib/view-config";
import {
  preferencesStorageKey,
  savePreferences,
  loadPreferences,
} from "../lib/storage";
import {
  chatHistoryStorageKey,
  loadChatHistory,
  saveChatHistory,
} from "../lib/chat-history";
import type { CustomizationRequest, Outcome } from "../lib/customization";

let post: (input: RequestInit) => Promise<Response>;
const payload = (init: RequestInit) =>
  JSON.parse(init.body as string) as CustomizationRequest;
function reply(request: CustomizationRequest, outcome: Outcome) {
  return Response.json({
    requestId: request.requestId,
    revision: request.revision,
    outcome,
  });
}
function applying(patch: Partial<ViewConfig>) {
  post = async (init) => {
    const p = payload(init);
    return reply(p, {
      outcome: "apply",
      reason: "configured",
      config: { ...p.config, ...patch },
    });
  };
}
function seed(patch: Partial<ViewConfig>) {
  savePreferences(briefs, { ...defaultView, ...patch }, localStorage);
}
async function ready() {
  const h = renderHook(() => useWorkspace());
  await waitFor(() => expect(h.result.current.loading).toBe(false));
  return h;
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  post = async () =>
    Response.json({ error: "Service unavailable" }, { status: 503 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/briefs")
        return Response.json({ briefs: briefs.map((b) => ({ key: b.key })) });
      if (url.startsWith("/api/briefs/")) {
        const key = url.split("/").at(-1) as keyof typeof raw;
        return Response.json({
          key,
          fingerprint: `test-${key}`,
          envelope: raw[key],
        });
      }
      return post(init!);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("applies one global request from an article and preserves it across persona navigation and reload", async () => {
  const sent: CustomizationRequest[] = [];
  post = async (init) => {
    const p = payload(init);
    sent.push(p);
    return reply(p, {
      outcome: "apply",
      reason: "configured",
      config: {
        ...p.config,
        freshness: "new",
        tiers: ["detail", "brief"],
        density: "compact",
      },
    });
  };
  window.history.replaceState({}, "", "/?market=space&item=5");
  const h = await ready();
  await act(() =>
    h.result.current.submit(
      "Only new, hide the one-liners and make it compact",
    ),
  );
  expect(sent[0].sources.map((b) => b.key).sort()).toEqual([
    "czsk",
    "enterprise",
    "space",
  ]);
  expect(sent[0]).not.toHaveProperty("context");
  expect(sent[0]).not.toHaveProperty("briefs");
  expect(sent[0].config).toEqual(defaultView);
  expect(h.result.current.preferences).toMatchObject({
    freshness: "new",
    tiers: ["detail", "brief"],
    density: "compact",
  });
  for (const view of Object.values(h.result.current.views))
    expect(view).toBe(h.result.current.preferences);
  expect(
    briefs.map((b) => orderedItems(b, h.result.current.preferences).length),
  ).toEqual([5, 3, 0]);
  const stored = localStorage.getItem(preferencesStorageKey);
  window.history.pushState({}, "", "/?market=enterprise");
  h.rerender();
  expect(localStorage.getItem(preferencesStorageKey)).toBe(stored);
  h.unmount();
  const restored = await ready();
  expect(restored.result.current.preferences).toEqual(
    JSON.parse(stored!).config,
  );
  expect(restored.result.current.messages).toHaveLength(1);
  expect(restored.result.current.messages[0]).not.toHaveProperty("scope");
});

it("does not cancel a global request when the reviewer changes perspective", async () => {
  let complete!: (value: Response) => void;
  let captured!: AbortSignal;
  let sent!: CustomizationRequest;
  post = async (init) => {
    sent = payload(init);
    captured = init.signal as AbortSignal;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  const h = await ready();
  act(() => {
    void h.result.current.submit("Numbers first");
  });
  await waitFor(() => expect(h.result.current.pending).toBe(true));
  window.history.pushState({}, "", "/?market=czsk");
  h.rerender();
  expect(h.result.current.pending).toBe(true);
  expect(captured.aborted).toBe(false);
  await act(async () =>
    complete(
      reply(sent, {
        outcome: "apply",
        reason: "configured",
        config: { ...defaultView, emphasis: "numbers_first" },
      }),
    ),
  );
  expect(h.result.current.preferences.emphasis).toBe("numbers_first");
  expect(h.result.current.views.czsk.emphasis).toBe("numbers_first");
});

it("removes only one applied preference globally, persists it and sends the remaining settings on follow-up", async () => {
  seed({
    freshness: "new",
    tiers: ["detail", "brief"],
    groupBy: "company",
    organizationIds: ["SpaceX"],
  });
  const h = await ready();
  act(() => h.result.current.removePreference("freshness"));
  expect(h.result.current.preferences).toEqual({
    ...defaultView,
    tiers: ["detail", "brief"],
    groupBy: "company",
    organizationIds: ["SpaceX"],
  });
  let sent!: CustomizationRequest;
  post = async (init) => {
    sent = payload(init);
    return reply(sent, {
      outcome: "apply",
      reason: "configured",
      config: { ...sent.config, density: "compact" },
    });
  };
  await act(() => h.result.current.submit("Also make it compact"));
  expect(sent.config.freshness).toBe("all");
  expect(sent.config.groupBy).toBe("company");
  expect(sent.config.organizationIds).toEqual(["SpaceX"]);
  expect(loadPreferences(briefs, localStorage).config.density).toBe("compact");
});

it("clears global source focus without dropping reading habits and can undo the entire transaction", async () => {
  const before = {
    ...defaultView,
    freshness: "new" as const,
    density: "compact" as const,
    current: briefs[0].recap.doc.currents[0].label,
    scopeIds: [briefs[0].scopes[0].id],
    organizationIds: ["SpaceX"],
    itemIds: [briefs[0].items[0].id],
  };
  savePreferences(briefs, before, localStorage);
  const h = await ready();
  act(() => h.result.current.removePreference("focus"));
  expect(h.result.current.preferences).toEqual({
    ...defaultView,
    freshness: "new",
    density: "compact",
  });
  act(() => h.result.current.undo());
  expect(h.result.current.preferences).toEqual(before);
  expect(loadPreferences(briefs, localStorage).config).toEqual(before);
});

it.each(["reset", "remove"])(
  "ignores a successful response made stale by %s",
  async (action) => {
    seed({ freshness: "new", groupBy: "company" });
    let complete!: (value: Response) => void;
    let sent!: CustomizationRequest;
    post = async (init) => {
      sent = payload(init);
      return new Promise((resolve) => {
        complete = resolve;
      });
    };
    const h = await ready();
    act(() => {
      void h.result.current.submit("Numbers first");
    });
    await waitFor(() => expect(h.result.current.pending).toBe(true));
    act(() =>
      action === "reset"
        ? h.result.current.reset()
        : h.result.current.removePreference("freshness"),
    );
    const expected = structuredClone(h.result.current.preferences);
    await act(async () =>
      complete(
        reply(sent, {
          outcome: "apply",
          reason: "configured",
          config: { ...sent.config, emphasis: "numbers_first" },
        }),
      ),
    );
    expect(h.result.current.preferences).toEqual(expected);
    expect(h.result.current.preferences.freshness).toBe("all");
    expect(h.result.current.pending).toBe(false);
    expect(h.result.current.messages).toHaveLength(0);
    expect(localStorage.getItem(chatHistoryStorageKey)).toBeNull();
  },
);

it("cancels explicitly and ignores the cancelled result", async () => {
  let complete!: (value: Response) => void;
  let sent!: CustomizationRequest;
  let signal!: AbortSignal;
  post = async (init) => {
    sent = payload(init);
    signal = init.signal as AbortSignal;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  const h = await ready();
  act(() => {
    void h.result.current.submit("Only new");
  });
  await waitFor(() => expect(h.result.current.pending).toBe(true));
  act(() => h.result.current.cancel());
  expect(signal.aborted).toBe(true);
  await act(async () =>
    complete(
      reply(sent, {
        outcome: "apply",
        reason: "configured",
        config: { ...defaultView, freshness: "new" },
      }),
    ),
  );
  expect(h.result.current.preferences).toEqual(defaultView);
  expect(h.result.current.messages).toHaveLength(0);
});

it("preserves valid preferences after provider failure and offers explicit retry", async () => {
  seed({ freshness: "new" });
  const h = await ready();
  await act(() => h.result.current.submit("Hide one-liners"));
  expect(h.result.current.preferences.freshness).toBe("new");
  expect(h.result.current.retry).toBe("Hide one-liners");
  expect(h.result.current.pending).toBe(false);
  expect(h.result.current.messages.at(-1)?.kind).toBe("error");
});

it.each(["invalid source", "invalid shape", "wrong request", "wrong revision"])(
  "rejects %s output atomically",
  async (kind) => {
    seed({ density: "compact" });
    post = async (init) => {
      const p = payload(init);
      return Response.json({
        requestId: kind === "wrong request" ? crypto.randomUUID() : p.requestId,
        revision: kind === "wrong revision" ? p.revision + 1 : p.revision,
        outcome: {
          outcome: "apply",
          reason: "configured",
          config:
            kind === "invalid shape"
              ? { freshness: "new" }
              : {
                  ...p.config,
                  freshness: "new",
                  ...(kind === "invalid source"
                    ? { itemIds: ["foreign"] }
                    : {}),
                },
        },
      });
    };
    const h = await ready();
    await act(() => h.result.current.submit("Only SpaceX"));
    expect(h.result.current.preferences).toEqual({
      ...defaultView,
      density: "compact",
    });
    expect(h.result.current.messages.at(-1)?.kind).toBe("error");
  },
);

it("keeps preferences and chat usable when persistence is denied", async () => {
  const h = await ready();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("Storage denied");
  });
  applying({ density: "compact" });
  await act(() => h.result.current.submit("Make it compact"));
  expect(h.result.current.preferences.density).toBe("compact");
  expect(h.result.current.sessionOnly).toBe(true);
  expect(h.result.current.messages).toHaveLength(1);
  expect(h.result.current.chatHistoryError).toContain("could not be saved");
});

it("persists applied settings and reset while keeping completed history intact", async () => {
  applying({ freshness: "new", density: "compact" });
  const h = await ready();
  await act(() => h.result.current.submit("Only new and compact"));
  const messages = h.result.current.messages;
  expect(loadChatHistory(localStorage)).toEqual(messages);
  act(() => h.result.current.reset());
  expect(h.result.current.preferences).toEqual(defaultView);
  expect(loadChatHistory(localStorage)).toEqual(messages);
  act(() => h.result.current.undo());
  expect(h.result.current.preferences).toMatchObject({
    freshness: "new",
    density: "compact",
  });
  act(() => h.result.current.reset());
  h.unmount();
  const restored = await ready();
  expect(restored.result.current.preferences).toEqual(defaultView);
  expect(restored.result.current.messages).toEqual(messages);
  expect(restored.result.current.canUndo).toBe(false);
});

it("restores all previous messages without truncation, persona filtering, duplication or replay", async () => {
  const history = Array.from({ length: 15 }, (_, i) => ({
    request: `Request ${i}`,
    response: `Response ${i}`,
    kind: (["success", "info", "error"] as const)[i % 3],
    ...(i % 2 === 0 ? { scope: "space" as const } : {}),
  }));
  saveChatHistory(history, localStorage);
  const saved = localStorage.getItem(chatHistoryStorageKey);
  let count = 0;
  post = async () => {
    count++;
    return Response.json({ error: "Unavailable" }, { status: 503 });
  };
  const h = await ready();
  expect(h.result.current.messages).toEqual(history);
  expect(localStorage.getItem(chatHistoryStorageKey)).toBe(saved);
  expect(count).toBe(0);
  window.history.pushState({}, "", "/?market=enterprise");
  h.rerender();
  expect(h.result.current.messages).toEqual(history);
  await act(() => h.result.current.submit("Another request"));
  expect(h.result.current.messages).toHaveLength(16);
  h.unmount();
  const restored = await ready();
  expect(restored.result.current.messages).toHaveLength(16);
  expect(count).toBe(1);
});

it.each([
  "not json",
  JSON.stringify({ version: 2, messages: [] }),
  JSON.stringify({
    version: 1,
    messages: [{ request: 42, response: "wrong shape", kind: "success" }],
  }),
])(
  "recovers from invalid history independently of valid global preferences: %s",
  async (saved) => {
    localStorage.setItem(chatHistoryStorageKey, saved);
    seed({ freshness: "new" });
    const h = await ready();
    expect(h.result.current.messages).toEqual([]);
    expect(h.result.current.chatHistoryError).toContain("could not be loaded");
    expect(h.result.current.preferences.freshness).toBe("new");
    await act(() => h.result.current.submit("Try again"));
    expect(h.result.current.chatHistoryError).toBe("");
    expect(loadChatHistory(localStorage)[0].request).toBe("Try again");
  },
);

it("retains old saved history when a write fails and recovers on a later request", async () => {
  const old = {
    request: "Earlier request",
    response: "Earlier response",
    kind: "info" as const,
  };
  saveChatHistory([old], localStorage);
  const h = await ready();
  const setItem = Storage.prototype.setItem;
  const denied = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (this: Storage, key, value) {
      if (key === chatHistoryStorageKey)
        throw new DOMException("Full", "QuotaExceededError");
      return setItem.call(this, key, value);
    });
  await act(() => h.result.current.submit("Another request"));
  expect(h.result.current.messages).toHaveLength(2);
  expect(loadChatHistory(localStorage)).toEqual([old]);
  denied.mockRestore();
  await act(() => h.result.current.submit("Retry later"));
  expect(h.result.current.chatHistoryError).toBe("");
  expect(loadChatHistory(localStorage)).toHaveLength(3);
});

it("keeps the reader usable when history cannot be read", async () => {
  const getItem = Storage.prototype.getItem;
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
    this: Storage,
    key,
  ) {
    if (key === chatHistoryStorageKey)
      throw new DOMException("Denied", "SecurityError");
    return getItem.call(this, key);
  });
  const h = await ready();
  expect(h.result.current.loadError).toBe("");
  expect(h.result.current.briefs).toHaveLength(3);
  expect(h.result.current.chatHistoryError).toContain("could not be loaded");
});

it("carries full clarification intent across reload and perspectives, then clears it on apply or pill removal", async () => {
  const request =
    "Group only my competitors by company and hide the one-liners";
  const sent: CustomizationRequest[] = [];
  post = async (init) => {
    const p = payload(init);
    sent.push(p);
    return reply(
      p,
      p.request === request
        ? { outcome: "clarify", reason: "choose_organizations", config: null }
        : {
            outcome: "apply",
            reason: "configured",
            config: {
              ...p.config,
              groupBy: "company",
              tiers: ["detail", "brief"],
              organizationIds: ["SpaceX", "Blue Origin"],
            },
          },
    );
  };
  const h = await ready();
  await act(() => h.result.current.submit(request));
  expect(h.result.current.preferences).toEqual(defaultView);
  h.unmount();
  window.history.pushState({}, "", "/?market=enterprise");
  const resumed = await ready();
  await act(() => resumed.result.current.submit("SpaceX and Blue Origin"));
  expect(sent[1].clarification).toEqual({
    requests: [request],
    reason: "choose_organizations",
  });
  expect(resumed.result.current.preferences).toMatchObject({
    groupBy: "company",
    tiers: ["detail", "brief"],
    organizationIds: ["SpaceX", "Blue Origin"],
  });
  await act(() => resumed.result.current.submit("Make it compact"));
  expect(sent[2].clarification).toBeUndefined();
  await act(() => resumed.result.current.submit(request));
  act(() => resumed.result.current.removePreference("groupBy"));
  await act(() => resumed.result.current.submit("Keep the rest"));
  expect(sent[4].clarification).toBeUndefined();
});

it("writes migrated global settings once and preserves legacy values for recovery", async () => {
  for (const [i, brief] of briefs.entries())
    localStorage.setItem(
      `aim:view:3:${brief.key}:${brief.fingerprint}`,
      JSON.stringify({
        ...defaultView,
        density: "compact",
        freshness: i === 0 ? "new" : "all",
      }),
    );
  const h = await ready();
  expect(h.result.current.preferences).toEqual({
    ...defaultView,
    density: "compact",
  });
  expect(h.result.current.storageNotice).toContain("Conflicting old settings");
  expect(
    JSON.parse(localStorage.getItem(preferencesStorageKey)!).config,
  ).toEqual(h.result.current.preferences);
  expect(
    JSON.parse(localStorage.getItem("aim:view:3:space:test-space")!).freshness,
  ).toBe("new");
  h.unmount();
  const restored = await ready();
  expect(restored.result.current.storageNotice).toBe("");
  expect(restored.result.current.preferences.density).toBe("compact");
});

it("loads and reloads the saved reading configuration without a model request", async () => {
  seed({ freshness: "new", density: "compact" });
  let modelCalls = 0;
  post = async () => {
    modelCalls++;
    throw Error("Provider offline");
  };
  const h = await ready();
  expect(h.result.current.preferences).toMatchObject({
    freshness: "new",
    density: "compact",
  });
  expect(h.result.current.loading).toBe(false);
  expect(
    orderedItems(h.result.current.briefs[0], h.result.current.preferences)
      .length,
  ).toBeGreaterThan(0);
  window.history.pushState({}, "", "/?market=enterprise&item=1");
  h.rerender();
  expect(h.result.current.preferences.freshness).toBe("new");
  h.unmount();
  const restored = await ready();
  expect(restored.result.current.preferences.density).toBe("compact");
  expect(restored.result.current.loadError).toBe("");
  expect(modelCalls).toBe(0);
});
it("keeps the saved brief readable while a slow model request waits", async () => {
  seed({ freshness: "new", density: "compact" });
  post = async () => new Promise(() => {});
  const h = await ready();
  const current = structuredClone(h.result.current.preferences);
  act(() => {
    void h.result.current.submit("Group by company");
  });
  await waitFor(() => expect(h.result.current.pending).toBe(true));
  expect(h.result.current.loading).toBe(false);
  expect(h.result.current.preferences).toEqual(current);
  expect(
    orderedItems(h.result.current.briefs[0], h.result.current.preferences)
      .length,
  ).toBeGreaterThan(0);
  act(() => h.result.current.removePreference("density"));
  expect(h.result.current.pending).toBe(false);
  expect(h.result.current.preferences.freshness).toBe("new");
  expect(h.result.current.preferences.density).toBe("comfortable");
});
