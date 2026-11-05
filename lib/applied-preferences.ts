import type { Brief } from "./brief";
import {
  defaultView,
  orderedItems,
  type ReaderPreferences,
  type ViewConfig,
} from "./view-config";
export type PreferenceId = keyof ReaderPreferences | "focus";
export type AppliedPreference = {
  id: PreferenceId;
  label: string;
  request: string;
  detail?: string;
};
export function appliedPreferences(
  config: ViewConfig,
  briefs: Brief[],
): AppliedPreference[] {
  const result: AppliedPreference[] = [];
  if (config.freshness !== "all")
    result.push({
      id: "freshness",
      label: config.freshness === "new" ? "New this week" : "New & updated",
      request: "Change which updates I see to ",
    });
  if (config.tiers.length !== 3)
    result.push({
      id: "tiers",
      label:
        config.tiers.length === 2 && !config.tiers.includes("one_liner")
          ? "No one-liners"
          : config.tiers
              .map(
                (t) =>
                  ({
                    detail: "In detail",
                    brief: "In brief",
                    one_liner: "One-liners",
                  })[t],
              )
              .join(" + "),
      request: "Change my reading depth to ",
    });
  if (config.emphasis !== "editorial")
    result.push({
      id: "emphasis",
      label: "Numbers first",
      request: "Change the story order to ",
    });
  if (config.groupBy !== "tier")
    result.push({
      id: "groupBy",
      label: {
        company: "By company",
        current: "By thread",
        scope: "By monitoring area",
      }[config.groupBy],
      request: "Group updates by ",
    });
  if (config.density !== "comfortable")
    result.push({
      id: "density",
      label: "Compact",
      request: "Change spacing to ",
    });
  if (
    [
      config.current,
      config.scopeIds,
      config.organizationIds,
      config.itemIds,
    ].some((v) => v !== null)
  ) {
    const organizations = config.organizationIds;
    const detail = [
      ...(organizations || []),
      ...(config.scopeIds || []).map(
        (id) =>
          briefs.flatMap((b) => b.scopes).find((s) => s.id === id)?.name ||
          "Other",
      ),
      ...(config.current
        ? [config.current === "__other" ? "Outside threads" : config.current]
        : []),
    ].join(", ");
    const label =
      organizations?.length === 1 &&
      config.current === null &&
      config.scopeIds === null &&
      config.itemIds === null
        ? organizations[0]
        : "Content focus";
    result.push({
      id: "focus",
      label,
      detail:
        detail ||
        `${briefs.reduce((sum, b) => sum + orderedItems(b, config).length, 0)} matching updates in the supplied data`,
      request: "Change my content focus to ",
    });
  }
  return result;
}
export function removePreference(
  config: ViewConfig,
  id: PreferenceId,
): ViewConfig {
  return id === "focus"
    ? {
        ...config,
        current: null,
        scopeIds: null,
        organizationIds: null,
        itemIds: null,
      }
    : { ...config, [id]: structuredClone(defaultView[id]) };
}
