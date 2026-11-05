import { z } from "zod";
import { keySchema, type Brief } from "./brief";
import {
  defaultView,
  validView,
  readerPreferences,
  type ViewConfig,
} from "./view-config";

export const preferencesStorageKey = "aim:preferences:4";
export const sourceSnapshot = (briefs: Brief[]) =>
  briefs
    .map((b) => ({ key: b.key, fingerprint: b.fingerprint }))
    .sort((a, b) => a.key.localeCompare(b.key));
const profileSchema = z
  .object({
    version: z.literal(4),
    sources: z
      .array(z.object({ key: keySchema, fingerprint: z.string() }).strict())
      .length(3),
    config: z.unknown(),
  })
  .strict();

export function loadPreferences(
  briefs: Brief[],
  storage: Pick<Storage, "getItem">,
) {
  const fallback = {
    config: structuredClone(defaultView),
    unavailable: false,
    notice: "",
    rewrite: false,
  };
  try {
    const raw = storage.getItem(preferencesStorageKey);
    if (raw) {
      const saved = profileSchema.parse(JSON.parse(raw));
      if (
        JSON.stringify(saved.sources) !== JSON.stringify(sourceSnapshot(briefs))
      ) {
        // Reading habits survive a new dataset; source-specific IDs must not drift.
        const reading = readerPreferences(saved.config as ViewConfig);
        return {
          ...fallback,
          config: { ...defaultView, ...reading },
          rewrite: true,
          notice:
            "The source briefs changed. Reading preferences were kept; content selections were cleared.",
        };
      }
      const config = validView(saved.config, briefs);
      if (!config) throw Error("Invalid preferences");
      return { ...fallback, config };
    }
    // Preserve old entries as a recoverable archive. Only shared reading values
    // have an unambiguous global meaning; source selections are not promoted.
    let found = false;
    const previous = briefs.map((brief) => {
      for (const version of [3, 2, 1]) {
        const raw = storage.getItem(
          `aim:view:${version}:${brief.key}:${brief.fingerprint}`,
        );
        if (!raw) continue;
        found = true;
        try {
          const value = JSON.parse(raw);
          if (version < 3) delete value.layout;
          return validView(value, brief) || defaultView;
        } catch {
          return defaultView;
        }
      }
      return defaultView;
    });
    if (!found) return fallback;
    const reading = readerPreferences(defaultView);
    for (const field of Object.keys(reading) as (keyof typeof reading)[]) {
      const values = previous.map((view) => readerPreferences(view)[field]);
      if (values.every((v) => JSON.stringify(v) === JSON.stringify(values[0])))
        Object.assign(reading, { [field]: values[0] });
    }
    const changed = previous.some(
      (v) =>
        JSON.stringify(v) !== JSON.stringify({ ...defaultView, ...reading }),
    );
    return {
      ...fallback,
      config: { ...defaultView, ...reading },
      rewrite: true,
      notice: changed
        ? "Preferences now apply everywhere. Conflicting old settings and category-only content filters were not carried over; their saved copies are preserved."
        : "",
    };
  } catch {
    return {
      ...fallback,
      unavailable: true,
      notice:
        "Saved preferences could not be loaded. The default brief is shown.",
    };
  }
}
export function savePreferences(
  briefs: Brief[],
  config: ViewConfig,
  storage: Pick<Storage, "setItem">,
) {
  const validated = validView(config, briefs);
  if (!validated) return false;
  try {
    storage.setItem(
      preferencesStorageKey,
      JSON.stringify({
        version: 4,
        sources: sourceSnapshot(briefs),
        config: validated,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
