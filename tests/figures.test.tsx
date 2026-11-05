import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { briefs } from "./fixtures";
import { FigureContent } from "../components/brief/figure";
import { Article } from "../components/brief/article";
import { defaultView } from "../lib/view-config";
import type { Workspace } from "../lib/use-workspace";
const figures = briefs.flatMap((b) => b.items.filter((i) => i.figure));
it.each(figures.map((item) => [item.id, item] as const))(
  "renders every source entry in figure %s",
  (_, item) => {
    const html = renderToStaticMarkup(<FigureContent item={item} />),
      b = item.figure!.block;
    const escape = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
    const texts =
      b.t === "timeline"
        ? b.points.map((p) => p.text)
        : b.t === "table"
          ? [...b.cols, ...b.rows.flatMap((r) => r.cells.map((c) => c.text))]
          : b.t === "comparison"
            ? [
                b.them.name,
                b.us.name,
                ...b.them.points.map((p) => p.text),
                ...b.us.points.map((p) => p.text),
              ]
            : b.data.map((p) => p.label);
    for (const value of texts.filter(Boolean))
      expect(html).toContain(escape(value));
    if (b.t === "chart")
      for (const row of b.data)
        expect(html).toContain(
          `width:${(row.value / Math.max(b.max_value || 0, ...b.data.map((d) => d.value), 1)) * 100}%`,
        );
    if (b.t === "table" && b.rows.some((r) => r.cells.some((c) => !c.text)))
      expect(html).toContain("Unspecified");
  },
);

const articleWorkspace = {
  views: Object.fromEntries(briefs.map((brief) => [brief.key, defaultView])),
} as unknown as Workspace;

it.each(briefs)(
  "keeps every supplied $key current reachable with its own status and summary",
  (brief) => {
    for (const current of brief.recap.doc.currents) {
      const item = brief.items.find((item) => item.current === current.label);
      expect(item, `No article exposes ${current.label}`).toBeDefined();
      const html = renderToStaticMarkup(
        <Article
          brief={brief}
          index={item!.index}
          workspace={articleWorkspace}
        />,
      );
      const status = new Map([
        ["new", "New"],
        ["updated", "Updated"],
      ]).get(current.status);
      expect(status).toBeDefined();
      expect(html).toContain(`aria-label="Current status: ${status}"`);
      expect(html).toContain(current.label);
      expect(html).toContain(current.line.replace(/&/g, "&amp;"));
      expect(html).toContain(`Current · ${current.since_label}`);
    }
  },
);

it("keeps an update's freshness independent from its current's status", () => {
  const brief = briefs[1];
  const item = brief.items.find(
    (item) => item.status === "new" && item.current !== null,
  )!;
  const html = renderToStaticMarkup(
    <Article brief={brief} index={item.index} workspace={articleWorkspace} />,
  );
  expect(html).toContain('aria-label="Update status: New"');
  expect(html).toContain('aria-label="Current status: Updated"');
});

it("labels a carried-over current without changing its update's supplied freshness (synthetic edge case)", () => {
  const brief = structuredClone(briefs[0]);
  const item = brief.items[0];
  const current = brief.recap.doc.currents.find(
    (current) => current.label === item.current,
  )!;
  current.status = "carried";
  const html = renderToStaticMarkup(
    <Article brief={brief} index={item.index} workspace={articleWorkspace} />,
  );
  expect(html).toContain('aria-label="Current status: Carried over"');
  expect(html).toContain('aria-label="Update status: Updated"');
});
