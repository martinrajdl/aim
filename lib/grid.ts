import type { Brief, BriefKey, Item } from "./brief";
import { orderedItems, quantitative, type ViewConfig } from "./view-config";

// Authored feature positions, NOT source priorities or a relevance score.
// The first item is large, the next two medium, the next three small.
export const featureOrder: Record<BriefKey, number[]> = {
  space: [5, 0, 1, 2, 3, 4],
  enterprise: [1, 0, 4, 2, 3, 6],
  czsk: [0, 1, 2, 3, 6, 7],
};
export function gridItems(brief: Brief, view: ViewConfig) {
  const visible = orderedItems(brief, view);
  const authored = featureOrder[brief.key]
    .map((index) => brief.items[index])
    .filter((item) => visible.includes(item));
  const seen = new Set<string>();
  const candidates = [...authored, ...visible].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  // Stable promotion of existing quantities, independent of their magnitude.
  if (view.emphasis === "numbers_first")
    candidates.sort(
      (a, b) => Number(quantitative(b)) - Number(quantitative(a)),
    );
  return candidates;
}

// Keep story positions stable when the viewport changes or chat opens.
// CSS rearranges these same links, with no hidden mobile or desktop copies.
export function partitionGrid(items: Item[]) {
  const featured = items.slice(0, 6);
  return {
    lead: featured[0],
    support: featured.slice(1, 3),
    secondary: featured.slice(3),
    remaining: items.slice(featured.length),
  };
}
