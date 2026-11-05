import { z } from "zod";
import { type Brief, type Item, tierSchema, rank, tierNames } from "./brief";
export const viewSchema = z
  .object({
    version: z.literal(1),
    freshness: z.enum(["all", "new", "changed"]),
    tiers: z.array(tierSchema).min(1).max(3),
    emphasis: z.enum(["editorial", "numbers_first"]),
    groupBy: z.enum(["tier", "company", "current", "scope"]),
    density: z.enum(["comfortable", "compact"]),
    current: z.string().nullable(),
    scopeIds: z.array(z.string()).nullable(),
    organizationIds: z.array(z.string()).nullable(),
    itemIds: z.array(z.string()).nullable(),
  })
  .strict();
export type ViewConfig = z.infer<typeof viewSchema>;
export const readerPreferencesSchema = viewSchema
  .pick({
    freshness: true,
    tiers: true,
    emphasis: true,
    groupBy: true,
    density: true,
  })
  .refine((view) => new Set(view.tiers).size === view.tiers.length);
export type ReaderPreferences = z.infer<typeof readerPreferencesSchema>;
export function readerPreferences(view: ViewConfig): ReaderPreferences {
  const { freshness, tiers, emphasis, groupBy, density } = view;
  return {
    ...readerPreferencesSchema.parse({
      freshness,
      tiers,
      emphasis,
      groupBy,
      density,
    }),
    tiers: [...view.tiers].sort((a, b) => rank[a] - rank[b]),
  };
}
export const defaultView: ViewConfig = {
  version: 1,
  freshness: "all",
  tiers: ["detail", "brief", "one_liner"],
  emphasis: "editorial",
  groupBy: "tier",
  density: "comfortable",
  current: null,
  scopeIds: null,
  organizationIds: null,
  itemIds: null,
};
const organizations = [
  "SpaceX",
  "Blue Origin",
  "Exolaunch",
  "ISRO",
  "ESA",
  "Rocket Factory Augsburg",
  "Isar Aerospace",
  "Bavaria Instruments",
  "ClearSpace",
  "Hubble Network",
  "Space Epoch",
  "Sirius Space Services",
  "OpenAI",
  "Microsoft",
  "Anthropic",
  "Maple VC",
  "Nscale",
  "Third Point",
  "Oracle",
  "Bessemer Venture Partners",
  "Meta",
  "Expedia",
  "Enveda",
  "Catalio Capital Management",
  "OpenEvidence",
  "Andreessen Horowitz",
  "Byers Capital",
  "Precision Neuroscience",
  "Basalt Health",
  "NEA",
  "Mironet",
  "Macaly",
  "Cequence",
  "Laati",
  "CVC",
  "CDN77",
  "EIF",
  "IP Lab Ventures",
  "VisionFlow",
  "Ranketta",
  "BottleCap AI",
  "Salesforce",
  "HubSpot",
  "Dataiku",
  "Google",
  "Mayfield",
  "Nvidia",
  "Starlink",
  "FAA",
  "Space Cargo Unlimited",
  "US Space Command",
  "Vercel",
  "team.blue",
];
// Explicit organization names, not inferred parent companies or competitor relationships.
// Every exposed match carries a path into the supplied content, including figures.
export function itemTextEntries(item: Item): { path: string; text: string }[] {
  const entries: { path: string; text: string }[] = [];
  function walk(value: unknown, path: string) {
    if (typeof value === "string") entries.push({ path, text: value });
    else if (Array.isArray(value))
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === "object")
      Object.entries(value).forEach(([key, v]) => {
        if (!["update_id", "key", "t", "date"].includes(key))
          walk(v, `${path}.${key}`);
      });
  }
  const prefix = `recap.doc.items[${item.index}]`;
  walk(item.headline, `${prefix}.headline`);
  walk(item.paragraphs, `${prefix}.paragraphs`);
  walk(item.means, `${prefix}.means`);
  walk(item.figure?.block, `${prefix}.figure.block`);
  return entries;
}
function named(text: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,
    "iu",
  ).test(text);
}
export function companyNames(item: Item) {
  const text = itemTextEntries(item)
    .map((entry) => entry.text)
    .join("\n");
  return organizations.filter((name) => named(text, name));
}
export function organizationCatalog(brief: Brief) {
  const entries = brief.items.flatMap((item) =>
    itemTextEntries(item).map((entry) => ({ itemId: item.id, ...entry })),
  );
  return organizations.flatMap((name) => {
    const evidence = entries.filter((entry) => named(entry.text, name));
    return evidence.length ? [{ id: name, label: name, evidence }] : [];
  });
}
export function quantitative(item: Item) {
  if (item.figure?.block.t === "chart") return true;
  const text = itemTextEntries(item)
    .map((entry) => entry.text)
    .join("\n");
  // Quantities with units, money and measured counts. Bare years, model versions,
  // numbered archetypes and timeline dates do not qualify on their own.
  return /[$€£]\s*\d|\d[\d.,–-]*\+?\s*(?:%|×|[xX]\b|GW\b|MW\b|million\b|billion\b|days?\b|seconds?\b|minutes?\b|acres?\b|tools?\b|customers?\b|cases?\b|(?:V\d\s+)?satellites?\b)|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|ninety)[ -](?:minute|second|compan(?:y|ies)|tool|customer)s?\b/iu.test(
    text,
  );
}
export function validView(
  value: unknown,
  source: Brief | Brief[],
): ViewConfig | null {
  const briefs = Array.isArray(source) ? source : [source];
  const result = viewSchema.safeParse(value);
  if (!result.success) return null;
  const v = result.data;
  const unique = (a: string[]) => new Set(a).size === a.length;
  if (!unique(v.tiers)) return null;
  if (
    v.current !== null &&
    v.current !== "__other" &&
    !briefs.some((brief) =>
      brief.recap.doc.currents.some((c) => c.label === v.current),
    )
  )
    return null;
  for (const [selected, allowed] of [
    [
      v.scopeIds,
      ["__other", ...briefs.flatMap((b) => b.scopes.map((s) => s.id))],
    ],
    [
      v.organizationIds,
      briefs.flatMap((b) => organizationCatalog(b).map((o) => o.id)),
    ],
    [v.itemIds, briefs.flatMap((b) => b.items.map((i) => i.id))],
  ] as [string[] | null, string[]][])
    if (
      selected &&
      (!unique(selected) || selected.some((id) => !allowed.includes(id)))
    )
      return null;
  return v;
}
export function matches(item: Item, view: ViewConfig) {
  return (
    (view.freshness === "all" ||
      (view.freshness === "new"
        ? item.status === "new"
        : ["new", "updated"].includes(item.status))) &&
    view.tiers.includes(item.tier) &&
    (view.current === null ||
      (view.current === "__other"
        ? !item.current
        : item.current === view.current)) &&
    (view.scopeIds === null ||
      view.scopeIds.includes(item.scope_id || "__other")) &&
    (view.organizationIds === null ||
      companyNames(item).some((n) => view.organizationIds!.includes(n))) &&
    (view.itemIds === null || view.itemIds.includes(item.id))
  );
}
export function orderedItems(brief: Brief, view: ViewConfig) {
  return brief.items
    .filter((i) => matches(i, view))
    .sort(
      (a, b) =>
        (view.emphasis === "numbers_first"
          ? Number(quantitative(b)) - Number(quantitative(a))
          : 0) ||
        rank[a.tier] - rank[b.tier] ||
        a.index - b.index,
    );
}
export const isModified = (v: ViewConfig) =>
  JSON.stringify(v) !== JSON.stringify(defaultView);
export function describeView(v: ViewConfig) {
  return (
    [
      v.freshness === "new"
        ? "Showing updates marked New"
        : v.freshness === "changed"
          ? "Showing New and Updated"
          : null,
      !v.tiers.includes("one_liner") ? "No one-liners" : null,
      v.tiers.length < 3 && v.tiers.includes("one_liner")
        ? v.tiers.map((t) => tierNames[t]).join(", ")
        : null,
      v.emphasis === "numbers_first" ? "Numbers first" : null,
      v.groupBy !== "tier"
        ? `By ${v.groupBy === "company" ? "organization" : v.groupBy}`
        : null,
      v.density === "compact" ? "Compact" : null,
      v.current
        ? v.current === "__other"
          ? "Other updates"
          : v.current
        : null,
      v.scopeIds ? "Selected monitoring areas" : null,
      v.organizationIds ? "Selected organizations" : null,
      v.itemIds ? "Selected updates" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Complete brief · Editorial order"
  );
}
export function groupItems(brief: Brief, view: ViewConfig) {
  const groups = new Map<string, Item[]>();
  for (const item of orderedItems(brief, view)) {
    const names =
      view.groupBy === "company"
        ? companyNames(item).filter(
            (name) =>
              view.organizationIds === null ||
              view.organizationIds.includes(name),
          )
        : [
            view.groupBy === "current"
              ? item.current || "Other"
              : view.groupBy === "scope"
                ? brief.scopes.find((s) => s.id === item.scope_id)?.name ||
                  "Other"
                : tierNames[item.tier],
          ];
    for (const name of names.length ? names : ["Other"])
      groups.set(name, [...(groups.get(name) || []), item]);
  }
  return view.groupBy === "company"
    ? [...groups].sort(([a], [b]) => a.localeCompare(b))
    : [...groups];
}
