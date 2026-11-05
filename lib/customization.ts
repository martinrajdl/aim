import { z } from "zod";
import { keySchema, type Brief } from "./brief";
import {
  viewSchema,
  validView,
  describeView,
  organizationCatalog,
} from "./view-config";
export const requestSchema = z
  .object({
    requestId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    request: z.string().trim().min(1).max(1500),
    config: viewSchema,
    sources: z
      .array(z.object({ key: keySchema, fingerprint: z.string() }).strict())
      .length(3),
    clarification: z
      .object({
        requests: z.array(z.string().trim().min(1).max(1500)).min(1).max(6),
        reason: z.enum(["choose_organizations", "ambiguous_request"]),
      })
      .strict()
      .optional(),
  })
  .strict();
export type CustomizationRequest = z.infer<typeof requestSchema>;
export const outcomeSchema = z
  .object({
    outcome: z.enum(["apply", "clarify", "unsupported"]),
    reason: z.enum([
      "configured",
      "choose_organizations",
      "ambiguous_request",
      "new_facts",
      "unsupported_presentation",
    ]),
    config: viewSchema.nullable(),
  })
  .strict();
export type Outcome = z.infer<typeof outcomeSchema>;
export function validateOutcome(raw: unknown, briefs: Brief[]): Outcome {
  const result = outcomeSchema.parse(raw);
  if (result.outcome !== "apply") {
    if (result.config !== null)
      throw Error("Non-applying outcome contains changes.");
    return result;
  }
  if (result.reason !== "configured" || !validView(result.config, briefs))
    throw Error("Invalid preference configuration.");
  return result;
}
export function outcomeMessage(outcome: Outcome) {
  if (outcome.outcome === "clarify")
    return outcome.reason === "choose_organizations"
      ? "Which organizations do you mean? Name them in your next message."
      : "Could you be more specific about what to show, hide or group? Your preferences are unchanged.";
  if (outcome.outcome === "unsupported")
    return outcome.reason === "new_facts"
      ? "I can reshape the supplied information, but cannot add forecasts, new facts or external updates. Your preferences are unchanged."
      : "That format is not available. Try changing the spacing, story order, grouping or content focus.";
  return `${describeView(outcome.config!)}. Applied to your reading preferences.`;
}
export function sourceCatalog(brief: Brief) {
  return {
    key: brief.key,
    subject: brief.recap.doc.subject,
    verdict: brief.recap.doc.verdict,
    currents: brief.recap.doc.currents,
    scopes: brief.scopes,
    organizations: organizationCatalog(brief),
    items: brief.items.map((i) => ({
      id: i.id,
      tier: i.tier,
      status: i.status,
      current: i.current,
      scope_id: i.scope_id,
      headline: i.headline,
      paragraphs: i.paragraphs,
      means: i.means,
      figure: i.figure,
    })),
  };
}
