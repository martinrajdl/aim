// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Chat } from "../components/brief/chat";
import { useWorkspace } from "../lib/use-workspace";
import { briefs, raw } from "./fixtures";
import { chatHistoryStorageKey, saveChatHistory } from "../lib/chat-history";
import { loadPreferences, savePreferences } from "../lib/storage";
import { defaultView, orderedItems } from "../lib/view-config";
import type { CustomizationRequest, Outcome } from "../lib/customization";

let model: (
  request: CustomizationRequest,
  init: RequestInit,
) => Promise<Outcome>;
let requests: CustomizationRequest[];
function Panel() {
  const workspace = useWorkspace();
  if (workspace.loading) return <p>Loading</p>;
  return (
    <>
      <output aria-label="Visible update counts">
        {workspace.briefs
          .map((brief) => orderedItems(brief, workspace.preferences).length)
          .join(", ")}
      </output>
      <Chat workspace={workspace} />
    </>
  );
}
const composer = () =>
  screen.getByRole("textbox", { name: "How should your brief change?" });
const saved = () => loadPreferences(briefs, localStorage).config;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  requests = [];
  HTMLElement.prototype.scrollTo = vi.fn();
  model = async (request) => ({
    outcome: "apply",
    reason: "configured",
    config: { ...request.config, freshness: "new" },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/briefs")
        return Response.json({
          briefs: briefs.map((brief) => ({ key: brief.key })),
        });
      if (url === "/api/customize") {
        const request = JSON.parse(
          init!.body as string,
        ) as CustomizationRequest;
        requests.push(request);
        const outcome = await model(request, init!);
        return Response.json({
          requestId: request.requestId,
          revision: request.revision,
          outcome,
        });
      }
      const key = url.split("/").at(-1) as keyof typeof raw;
      return Response.json({
        key,
        fingerprint: `test-${key}`,
        envelope: raw[key],
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("opens directly into chat, restores previous requests separately and never replays them", async () => {
  savePreferences(briefs, { ...defaultView, density: "compact" }, localStorage);
  saveChatHistory(
    [
      {
        request: "An old request",
        response: "Earlier preferences",
        kind: "success",
        scope: "enterprise",
      },
    ],
    localStorage,
  );
  render(<Panel />);
  await screen.findByRole("textbox");
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByRole("button", { name: "Preferences" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Edit preference: Compact" }),
  ).toBeTruthy();
  const archive = screen.getByText("Conversation history").closest("details")!;
  expect(archive.open).toBe(false);
  expect(
    within(archive).getByText("Earlier preferences", { exact: false }),
  ).toBeTruthy();
  expect(
    screen.getAllByRole("button", { name: /^Send suggestion:/ }),
  ).toHaveLength(4);
  expect(requests).toHaveLength(0);
  expect(saved().density).toBe("compact");
});

it("sends a suggested message through the same global model path and updates all projections", async () => {
  render(<Panel />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Send suggestion: Only new this week",
    }),
  );
  await screen.findByRole("button", { name: "Remove New this week" });
  expect(requests).toHaveLength(1);
  expect(requests[0].request).toBe("Only new this week");
  expect(requests[0].config).toEqual(defaultView);
  expect(requests[0].sources.map((source) => source.key).sort()).toEqual([
    "czsk",
    "enterprise",
    "space",
  ]);
  expect(screen.getByLabelText("Visible update counts").textContent).toBe(
    "12, 10, 5",
  );
  expect(saved().freshness).toBe("new");
  expect(
    JSON.parse(localStorage.getItem(chatHistoryStorageKey)!).messages[0],
  ).not.toHaveProperty("scope");
});

it("removes one applied pill without losing the others, and clearing all survives a reload", async () => {
  model = async (request) => ({
    outcome: "apply",
    reason: "configured",
    config: {
      ...request.config,
      freshness: "new",
      tiers: ["detail", "brief"],
      density: "compact",
    },
  });
  const mounted = render(<Panel />);
  await screen.findByRole("textbox");
  fireEvent.change(composer(), {
    target: { value: "Only new, hide the one-liners and make it compact" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send request" }));
  await screen.findByRole("button", { name: "Remove New this week" });
  expect(screen.getByLabelText("Visible update counts").textContent).toBe(
    "5, 3, 0",
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove New this week" }));
  expect(saved()).toMatchObject({
    freshness: "all",
    tiers: ["detail", "brief"],
    density: "compact",
  });
  expect(
    screen.getByRole("button", { name: "Remove No one-liners" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Remove Compact" })).toBeTruthy();
  expect(requests).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
  expect(saved()).toEqual(defaultView);
  expect(
    screen.queryByRole("region", { name: "Applied preferences" }),
  ).toBeNull();
  expect(screen.getByLabelText("Visible update counts").textContent).toBe(
    "13, 12, 11",
  );
  mounted.unmount();
  render(<Panel />);
  await screen.findByRole("textbox");
  expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
  expect(saved()).toEqual(defaultView);
  expect(
    JSON.parse(localStorage.getItem(chatHistoryStorageKey)!).messages,
  ).toHaveLength(1);
  expect(requests).toHaveLength(1);
});

it("edits an applied preference in chat with the remaining global configuration intact", async () => {
  savePreferences(
    briefs,
    {
      ...defaultView,
      freshness: "new",
      density: "compact",
      organizationIds: ["SpaceX"],
    },
    localStorage,
  );
  model = async (request) => ({
    outcome: "apply",
    reason: "configured",
    config: { ...request.config, freshness: "changed" },
  });
  render(<Panel />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Edit preference: New this week",
    }),
  );
  expect((composer() as HTMLTextAreaElement).value).toBe(
    "Change which updates I see to ",
  );
  expect(document.activeElement).toBe(composer());
  expect(requests).toHaveLength(0);
  fireEvent.change(composer(), {
    target: { value: "Change which updates I see to new and updated" },
  });
  fireEvent.keyDown(composer(), { key: "Enter", shiftKey: false });
  await screen.findByRole("button", { name: "Remove New & updated" });
  expect(requests[0].config).toMatchObject({
    density: "compact",
    organizationIds: ["SpaceX"],
  });
  expect(saved()).toMatchObject({
    freshness: "changed",
    density: "compact",
    organizationIds: ["SpaceX"],
  });
  fireEvent.click(screen.getByRole("button", { name: "Remove SpaceX" }));
  expect(saved().organizationIds).toBeNull();
  expect(saved().freshness).toBe("changed");
});

it("keeps applied preferences readable and removable while a model response is slow", async () => {
  savePreferences(
    briefs,
    { ...defaultView, freshness: "new", density: "compact" },
    localStorage,
  );
  let signal!: AbortSignal;
  model = async (_request, init) => {
    signal = init.signal as AbortSignal;
    return new Promise(() => {});
  };
  render(<Panel />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Send suggestion: Group by company",
    }),
  );
  await screen.findByRole("button", { name: "Cancel" });
  expect(screen.getByLabelText("Visible update counts").textContent).toBe(
    "12, 10, 5",
  );
  expect(screen.getByRole("button", { name: "Remove Compact" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove Compact" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull(),
  );
  expect(signal.aborted).toBe(true);
  expect(saved()).toMatchObject({ freshness: "new", density: "comfortable" });
  expect(screen.getByLabelText("Visible update counts").textContent).toBe(
    "12, 10, 5",
  );
  expect(screen.getByRole("button", { name: "Send request" })).toBeTruthy();
});
