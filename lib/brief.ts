import { z } from "zod";
export const briefKeys = ["space", "enterprise", "czsk"] as const;
export const keySchema = z.enum(briefKeys);
export type BriefKey = z.infer<typeof keySchema>;
export const metadata: Record<
  BriefKey,
  { label: string; reader: string; audience: string; file: string }
> = {
  space: {
    label: "Space launch",
    reader: "European launch provider",
    audience: "a European launch provider",
    file: "brief-space-launch.json",
  },
  enterprise: {
    label: "Enterprise AI",
    reader: "Founder raising a round",
    audience: "a San Francisco founder raising a round",
    file: "brief-enterprise-ai.json",
  },
  czsk: {
    label: "CZ & SK AI",
    reader: "Founder in Czechia & Slovakia",
    audience: "a founder in Czechia & Slovakia",
    file: "brief-cz-sk-ai.json",
  },
};
export const tierSchema = z.enum(["detail", "brief", "one_liner"]);
export type Tier = z.infer<typeof tierSchema>;
const text = z.string();
const nullableText = text.nullish();
const base = { head: text, lead: nullableText };
const point = z.object({ text });
export const blockSchema = z.discriminatedUnion("t", [
  z.object({
    ...base,
    t: z.literal("timeline"),
    points: z.array(z.object({ date: text, text, update_id: text })),
  }),
  z.object({
    ...base,
    t: z.literal("chart"),
    title: nullableText,
    unit: text,
    max_value: z.number().nullable(),
    foot: nullableText,
    data: z.array(
      z.object({
        key: text,
        label: text,
        value: z.number(),
        highlight: z.boolean(),
        note: nullableText,
      }),
    ),
  }),
  z.object({
    ...base,
    t: z.literal("table"),
    title: nullableText,
    cols: z.array(text),
    rows: z.array(z.object({ cells: z.array(point) })),
  }),
  z.object({
    ...base,
    t: z.literal("comparison"),
    them: z.object({ name: text, points: z.array(point) }),
    us: z.object({ name: text, points: z.array(point) }),
  }),
]);
export const figureSchema = z.object({
  scope: z.enum(["item", "current"]),
  fresh_update_ids: z.array(text),
  block: blockSchema,
});
export type FigureData = z.infer<typeof figureSchema>;
const itemSchema = z.object({
  headline: text,
  tier: tierSchema,
  status: text,
  date: text,
  paragraphs: z.array(text),
  means: nullableText,
  current: nullableText,
  scope_id: nullableText,
  cited_signal_ids: z.array(text),
  cited_update_ids: z.array(text),
  read_update_ids: z.array(text),
  figure: z.unknown().optional(),
});
export const envelopeSchema = z.object({
  recap: z.object({
    id: text,
    period_start: text,
    period_end: text,
    doc: z.object({
      subject: text,
      verdict: text,
      currents: z.array(
        z.object({
          since: text,
          since_label: text,
          status: text,
          label: text,
          line: text,
          cited_signal_ids: z.array(text),
        }),
      ),
      items: z.array(itemSchema),
    }),
  }),
  citations: z.array(
    z.object({
      id: text,
      title: text,
      date: text,
      subtitle: nullableText,
      sourceCount: z.number().optional(),
      severityLevel: text.optional(),
    }),
  ),
  scopes: z.array(z.object({ id: text, name: text })),
});
export type Envelope = z.infer<typeof envelopeSchema>;
export type Item = Omit<Envelope["recap"]["doc"]["items"][number], "figure"> & {
  id: string;
  index: number;
  figure: FigureData | null;
  figureError: boolean;
};
export type Brief = Envelope & {
  key: BriefKey;
  label: string;
  reader: string;
  audience: string;
  fingerprint: string;
  items: Item[];
};
export function normalizeBrief(
  key: BriefKey,
  raw: unknown,
  fingerprint: string,
): Brief {
  const source = envelopeSchema.parse(raw);
  return {
    ...source,
    key,
    ...metadata[key],
    fingerprint,
    items: source.recap.doc.items.map((item, index) => {
      const figure = figureSchema.safeParse(item.figure);
      return {
        ...item,
        id: `${source.recap.id}:${index}`,
        index,
        figure: figure.success ? figure.data : null,
        figureError: item.figure != null && !figure.success,
      };
    }),
  };
}
export function title(brief: Brief) {
  return brief.recap.doc.subject.trim() || brief.recap.doc.verdict;
}
export const tierNames: Record<Tier, string> = {
  detail: "In detail",
  brief: "In brief",
  one_liner: "Also this week",
};
export const rank: Record<Tier, number> = { detail: 0, brief: 1, one_liner: 2 };
const months = [
  ["Jan", "January"],
  ["Feb", "February"],
  ["Mar", "March"],
  ["Apr", "April"],
  ["May", "May"],
  ["Jun", "June"],
  ["Jul", "July"],
  ["Aug", "August"],
  ["Sept", "September"],
  ["Oct", "October"],
  ["Nov", "November"],
  ["Dec", "December"],
] as const;
export function formatDate(date: string, long = false) {
  // Source dates are calendar dates. Fixed English labels avoid time-zone
  // shifts and ICU differences (Sep/Sept) during server/client hydration.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  const label = months[Number(month) - 1];
  if (!label || Number(day) < 1 || Number(day) > 31) return date;
  return `${Number(day)} ${label[long ? 1 : 0]}${long ? ` ${year}` : ""}`;
}
export const objectUrl = (id: string) =>
  `https://app.startaiming.com/o/${encodeURIComponent(id)}`;
export const articleHref = (key: BriefKey, index: number) =>
  `/?market=${key}&item=${index}`;
export const marketHref = (key?: BriefKey) => (key ? `/?market=${key}` : "/");
