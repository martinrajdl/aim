// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PublicationGrid } from "../components/brief/publication-grid";
import { briefs } from "./fixtures";
import { defaultView, quantitative, type ViewConfig } from "../lib/view-config";
import { gridItems, featureOrder, partitionGrid } from "../lib/grid";
import type { Workspace } from "../lib/use-workspace";
afterEach(cleanup);
function workspace(patch: Partial<ViewConfig> = {}): Workspace {
  const preferences = { ...defaultView, ...patch };
  return {
    briefs,
    preferences,
    views: Object.fromEntries(briefs.map((b) => [b.key, preferences])),
    reset: vi.fn(),
    openSettings: vi.fn(),
  } as unknown as Workspace;
}

it.each(briefs)(
  "preserves the authored order and all source identities in $key",
  (brief) => {
    const items = gridItems(brief, defaultView);
    expect(items.slice(0, 6).map((i) => i.index)).toEqual(
      featureOrder[brief.key],
    );
    expect(new Set(items.map((i) => i.id)).size).toBe(brief.items.length);
  },
);

it.each(briefs)(
  "renders only $key's original brief and one link per eligible update",
  (brief) => {
    render(<PublicationGrid brief={brief} workspace={workspace()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      brief.recap.doc.subject,
    );
    expect(screen.getByText(brief.recap.doc.verdict)).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /^Read:/ });
    expect(links).toHaveLength(brief.items.length);
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(
      hrefs.every((href) => href?.startsWith(`/?market=${brief.key}&item=`)),
    ).toBe(true);
    expect(
      screen.queryByRole("heading", { name: "Weekly overview" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Headlines" })).toBeNull();
    expect(screen.queryByRole("button", { name: "More updates" })).toBeNull();
  },
);

it.each(briefs)(
  "keeps every eligible $key story in a single responsive composition",
  (brief) => {
    for (const density of ["comfortable", "compact"] as const) {
      const items = gridItems(brief, {
        ...defaultView,
        freshness: "new",
        density,
      });
      const result = partitionGrid(items);
      const shown = [
        result.lead,
        ...result.support,
        ...result.secondary,
        ...result.remaining,
      ].filter(Boolean);
      expect(shown).toEqual(items);
      expect(new Set(shown.map((item) => item!.id)).size).toBe(items.length);
    }
  },
);

it("promotes quantitative stories stably without ranking amounts", () => {
  const items = gridItems(briefs[1], {
    ...defaultView,
    emphasis: "numbers_first",
  });
  const flags = items.map((i) => Number(quantitative(i)));
  expect(flags).toEqual([...flags].sort((a, b) => b - a));
  const original = gridItems(briefs[1], defaultView).filter(quantitative);
  expect(items.filter(quantitative)).toEqual(original);
});

it("fills the lead position only from eligible stories", () => {
  expect(
    gridItems(briefs[1], { ...defaultView, freshness: "new" })[0].index,
  ).toBe(4);
  expect(gridItems(briefs[1], { ...defaultView, itemIds: [] })).toEqual([]);
});

it("applies global density to the individual brief and groups eligible source stories", () => {
  const { container, rerender } = render(
    <PublicationGrid
      brief={briefs[1]}
      workspace={workspace({ density: "compact" })}
    />,
  );
  expect(
    container.querySelector(".brief-publication.is-compact .edition-grid"),
  ).toBeTruthy();
  expect(
    container.querySelector(".brief-story--lead")?.getAttribute("href"),
  ).toBe("/?market=enterprise&item=1");
  rerender(
    <PublicationGrid
      brief={briefs[1]}
      workspace={workspace({
        groupBy: "company",
        organizationIds: ["Salesforce"],
      })}
    />,
  );
  expect(screen.getAllByRole("link", { name: /^Read:/ })).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Salesforce 1" })).toBeTruthy();
});

it("keeps exclusions consistent in every part of the publication", () => {
  render(
    <PublicationGrid
      brief={briefs[1]}
      workspace={workspace({ tiers: ["detail"] })}
    />,
  );
  const links = screen.getAllByRole("link", { name: /^Read:/ });
  expect(links).toHaveLength(2);
  for (const link of links) {
    const index = Number(
      new URL(link.getAttribute("href")!, "http://localhost").searchParams.get(
        "item",
      ),
    );
    expect(briefs[1].items[index].tier).toBe("detail");
  }
});

it("offers chat recovery for empty results without silently resetting preferences", () => {
  const w = workspace({ itemIds: [] });
  render(<PublicationGrid brief={briefs[1]} workspace={w} />);
  expect(screen.queryByRole("link", { name: /^Read:/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Adjust preferences" }));
  expect(w.openSettings).toHaveBeenCalledOnce();
  expect(w.reset).not.toHaveBeenCalled();
});

it("preserves a complete remaining-updates rail without promoting every item into feature slots", () => {
  const result = partitionGrid(gridItems(briefs[0], defaultView));
  expect(result.support).toHaveLength(2);
  expect(result.secondary).toHaveLength(3);
  expect(result.remaining).toHaveLength(7);
});
