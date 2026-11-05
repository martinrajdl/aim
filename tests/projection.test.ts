import { describe, it, expect } from "vitest";
import { briefs, raw } from "./fixtures";
import { normalizeBrief, title, rank } from "../lib/brief";
import {
  defaultView,
  orderedItems,
  validView,
  quantitative,
  groupItems,
  organizationCatalog,
  itemTextEntries,
} from "../lib/view-config";
import { validateOutcome, outcomeMessage } from "../lib/customization";
import {
  loadPreferences,
  savePreferences,
  preferencesStorageKey,
  sourceSnapshot,
} from "../lib/storage";
describe("supplied briefs", () => {
  it("loads all 36 items and every supplied figure", () => {
    expect(briefs.map((b) => b.items.length)).toEqual([13, 12, 11]);
    const figures = briefs.flatMap((b) => b.items.filter((i) => i.figure));
    expect(figures).toHaveLength(9);
    expect(new Set(figures.map((i) => i.figure!.block.t))).toEqual(
      new Set(["timeline", "chart", "table", "comparison"]),
    );
    expect(briefs.flatMap((b) => b.items).some((i) => i.figureError)).toBe(
      false,
    );
  });
  it("normalization preserves all source prose, figures and citation metadata", () => {
    for (const brief of briefs) {
      expect(brief.recap).toEqual(raw[brief.key].recap);
      expect(brief.citations).toEqual(raw[brief.key].citations);
      for (const item of brief.items) {
        expect(item.headline).toBe(
          raw[brief.key].recap.doc.items[item.index].headline,
        );
        expect(item.paragraphs).toEqual(
          raw[brief.key].recap.doc.items[item.index].paragraphs,
        );
      }
    }
  });
  it("uses the verdict when the subject is blank", () => {
    const copy = structuredClone(raw.space);
    copy.recap.doc.subject = "  ";
    expect(title(normalizeBrief("space", copy, "test"))).toBe(
      copy.recap.doc.verdict,
    );
  });
  it("keeps malformed figures isolated from the readable brief", () => {
    const copy = structuredClone(raw.space);
    copy.recap.doc.items[0].figure!.block.t = "unsupported" as "timeline";
    const b = normalizeBrief("space", copy, "test");
    expect(b.items).toHaveLength(13);
    expect(b.items[0].figureError).toBe(true);
  });
  it.each(briefs.map((b) => [b.key, b] as const))(
    "%s has stable tier order and original item identities",
    (_, brief) => {
      const items = orderedItems(brief, defaultView);
      expect(items.map((i) => rank[i.tier])).toEqual(
        items.map((i) => rank[i.tier]).sort(),
      );
      expect(new Set(items.map((i) => i.id)).size).toBe(brief.items.length);
      for (const i of items) expect(i.id).toBe(`${brief.recap.id}:${i.index}`);
    },
  );
  it("new only plus no one-liners can legitimately be empty", () => {
    const config = {
      ...defaultView,
      freshness: "new" as const,
      tiers: ["detail", "brief"] as const,
    };
    expect(
      briefs.map(
        (b) => orderedItems(b, { ...config, tiers: [...config.tiers] }).length,
      ),
    ).toEqual([5, 3, 0]);
  });
  it("does not mistake archetype digits for financial metrics", () => {
    expect(quantitative(briefs[1].items[3])).toBe(false);
    expect(quantitative(briefs[1].items[4])).toBe(true);
  });
  it("company membership has exact source evidence and does not lose unmatched stories", () => {
    for (const b of briefs) {
      for (const org of organizationCatalog(b))
        for (const e of org.evidence)
          expect(
            itemTextEntries(b.items.find((i) => i.id === e.itemId)!),
          ).toContainEqual({ path: e.path, text: e.text });
      expect(
        new Set(
          groupItems(b, { ...defaultView, groupBy: "company" }).flatMap(
            ([, items]) => items.map((i) => i.id),
          ),
        ).size,
      ).toBe(b.items.length);
    }
  });
});
describe("global configuration boundary", () => {
  it("accepts one global configuration and rejects the old per-persona protocol", () => {
    const config = { ...defaultView, freshness: "new" as const };
    expect(
      validateOutcome(
        { outcome: "apply", reason: "configured", config },
        briefs,
      ).config,
    ).toEqual(config);
    expect(() =>
      validateOutcome(
        {
          outcome: "apply",
          reason: "configured",
          configurations: briefs.map((b) => ({ key: b.key, config })),
        },
        briefs,
      ),
    ).toThrow();
  });
  it("validates source selections against the union without broadening another reader's data", () => {
    const config = {
      ...defaultView,
      itemIds: [briefs[0].items[0].id, briefs[1].items[1].id],
    };
    expect(validView(config, briefs)).toEqual(config);
    expect(briefs.map((b) => orderedItems(b, config).length)).toEqual([
      1, 1, 0,
    ]);
    const focused = { ...defaultView, organizationIds: ["SpaceX"] };
    expect(validView(focused, briefs)).toEqual(focused);
    expect(orderedItems(briefs[0], focused).length).toBeGreaterThan(0);
    expect(orderedItems(briefs[2], focused)).toHaveLength(0);
  });
  it.each(["itemIds", "scopeIds", "organizationIds"] as const)(
    "rejects foreign %s even when the remaining global fields are valid",
    (field) => {
      expect(
        validView({ ...defaultView, [field]: ["foreign-id"] }, briefs),
      ).toBeNull();
      expect(() =>
        validateOutcome(
          {
            outcome: "apply",
            reason: "configured",
            config: {
              ...defaultView,
              freshness: "new",
              [field]: ["foreign-id"],
            },
          },
          briefs,
        ),
      ).toThrow();
    },
  );
  it("rejects unknown currents, duplicate tiers and injected executable fields", () => {
    expect(
      validView({ ...defaultView, current: "made up" }, briefs),
    ).toBeNull();
    expect(
      validView({ ...defaultView, tiers: ["detail", "detail"] }, briefs),
    ).toBeNull();
    expect(validView({ ...defaultView, html: "<script/>" }, briefs)).toBeNull();
  });
  it("keeps an intentional empty selection empty for every reader", () => {
    const config = { ...defaultView, itemIds: [] };
    expect(validView(config, briefs)).toEqual(config);
    expect(briefs.every((b) => orderedItems(b, config).length === 0)).toBe(
      true,
    );
  });
  it("rejects a partial applying outcome and changes inside non-applying outcomes", () => {
    expect(() =>
      validateOutcome(
        {
          outcome: "apply",
          reason: "configured",
          config: { freshness: "new" },
        },
        briefs,
      ),
    ).toThrow();
    expect(() =>
      validateOutcome(
        { outcome: "apply", reason: "configured", config: null },
        briefs,
      ),
    ).toThrow();
    for (const outcome of ["clarify", "unsupported"])
      expect(() =>
        validateOutcome(
          { outcome, reason: "ambiguous_request", config: defaultView },
          briefs,
        ),
      ).toThrow();
  });
  it("renders acknowledgments from the accepted settings instead of model-authored reporting", () => {
    const outcome = validateOutcome(
      {
        outcome: "apply",
        reason: "configured",
        config: {
          ...defaultView,
          freshness: "new",
          tiers: ["detail", "brief"],
        },
      },
      briefs,
    );
    expect(outcomeMessage(outcome)).toContain("Showing updates marked New");
    expect(outcomeMessage(outcome)).toContain("No one-liners");
    expect(outcomeMessage(outcome)).not.toContain("CZ");
    expect(() =>
      validateOutcome({ ...outcome, message: "Invented reporting" }, briefs),
    ).toThrow();
  });
});

describe("global persistence", () => {
  function memory() {
    const entries = new Map<string, string>();
    return {
      entries,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        entries.set(key, value);
      },
    };
  }
  it("round-trips one source-validated global profile under one stable key", () => {
    const storage = memory();
    const config = {
      ...defaultView,
      emphasis: "numbers_first" as const,
      organizationIds: ["SpaceX", "Microsoft"],
    };
    expect(savePreferences(briefs, config, storage)).toBe(true);
    expect([...storage.entries.keys()]).toEqual([preferencesStorageKey]);
    expect(loadPreferences(briefs, storage).config).toEqual(config);
    expect(loadPreferences([...briefs].reverse(), storage).config).toEqual(
      config,
    );
  });
  it.each([
    "{broken",
    JSON.stringify({ version: 999 }),
    JSON.stringify({
      version: 4,
      sources: sourceSnapshot(briefs),
      config: { ...defaultView, itemIds: ["foreign"] },
    }),
  ])("recovers from malformed or incompatible saved state: %s", (raw) => {
    const restored = loadPreferences(briefs, {
      getItem: (key) => (key === preferencesStorageKey ? raw : null),
    });
    expect(restored.config).toEqual(defaultView);
    expect(restored.unavailable).toBe(true);
    expect(restored.notice).not.toBe("");
  });
  it("reports inaccessible storage and refuses to persist invalid source selections", () => {
    expect(
      loadPreferences(briefs, {
        getItem: () => {
          throw Error("Denied");
        },
      }).unavailable,
    ).toBe(true);
    expect(
      savePreferences(briefs, defaultView, {
        setItem: () => {
          throw Error("Full");
        },
      }),
    ).toBe(false);
    const storage = memory();
    expect(
      savePreferences(
        briefs,
        { ...defaultView, itemIds: ["foreign"] },
        storage,
      ),
    ).toBe(false);
    expect(storage.entries.size).toBe(0);
  });
  it("preserves reading habits but clears stale source selections after the source changes", () => {
    const storage = memory();
    const config = {
      ...defaultView,
      freshness: "new" as const,
      density: "compact" as const,
      itemIds: [briefs[0].items[0].id],
      organizationIds: ["SpaceX"],
    };
    savePreferences(briefs, config, storage);
    const changed = briefs.map((b, index) =>
      index === 0 ? { ...b, fingerprint: "new-source" } : b,
    );
    const restored = loadPreferences(changed, storage);
    expect(restored.config).toEqual({
      ...defaultView,
      freshness: "new",
      density: "compact",
    });
    expect(restored.rewrite).toBe(true);
    expect(restored.notice).toContain("source briefs changed");
    savePreferences(changed, restored.config, storage);
    expect(loadPreferences(changed, storage).notice).toBe("");
  });
  it("migrates only common reading fields, keeps old records, and does not globalize local focus", () => {
    const storage = memory();
    for (const [index, brief] of briefs.entries())
      storage.setItem(
        `aim:view:3:${brief.key}:${brief.fingerprint}`,
        JSON.stringify({
          ...defaultView,
          freshness: index === 0 ? "new" : "all",
          density: "compact",
          organizationIds: index === 0 ? ["SpaceX"] : null,
        }),
      );
    const old = [...storage.entries];
    const restored = loadPreferences(briefs, storage);
    expect(restored.config).toEqual({ ...defaultView, density: "compact" });
    expect(restored.notice).toContain("Conflicting old settings");
    expect(restored.rewrite).toBe(true);
    savePreferences(briefs, restored.config, storage);
    for (const [key, value] of old) expect(storage.getItem(key)).toBe(value);
  });
  it("migrates retired layout fields only when the remaining reading values agree", () => {
    const storage = memory();
    for (const brief of briefs)
      storage.setItem(
        `aim:view:2:${brief.key}:${brief.fingerprint}`,
        JSON.stringify({
          ...defaultView,
          layout: "threads",
          freshness: "new",
          density: "compact",
        }),
      );
    const restored = loadPreferences(briefs, storage);
    expect(restored.config).toEqual({
      ...defaultView,
      freshness: "new",
      density: "compact",
    });
    expect(restored.config).not.toHaveProperty("layout");
  });
  it("reset persists defaults so legacy overrides cannot return", () => {
    const storage = memory();
    for (const brief of briefs)
      storage.setItem(
        `aim:view:1:${brief.key}:${brief.fingerprint}`,
        JSON.stringify({ ...defaultView, freshness: "new" }),
      );
    expect(loadPreferences(briefs, storage).config.freshness).toBe("new");
    savePreferences(briefs, defaultView, storage);
    expect(loadPreferences(briefs, storage).config).toEqual(defaultView);
    expect(storage.entries.size).toBe(4);
  });
});

it("finds organization mentions inside supplied tables and paragraphs with exact paths", () => {
  const enterprise = briefs[1];
  const catalog = organizationCatalog(enterprise);
  expect(catalog.find((o) => o.id === "Salesforce")?.evidence).toContainEqual({
    itemId: enterprise.items[1].id,
    path: "recap.doc.items[1].figure.block.rows[1].cells[0].text",
    text: "Salesforce",
  });
  expect(
    orderedItems(enterprise, {
      ...defaultView,
      organizationIds: ["Salesforce"],
    }).map((i) => i.index),
  ).toEqual([1]);
  expect(
    catalog
      .find((o) => o.id === "Google")
      ?.evidence.some((e) => e.path.includes("paragraphs")),
  ).toBe(true);
});
it("recognizes supplied measured counts and capacity without treating model versions as metrics", () => {
  expect(quantitative(briefs[2].items[2])).toBe(true); // Cequence: 105 tools
  expect(quantitative(briefs[2].items[9])).toBe(true); // Ranketta: 100+ customers
  expect(quantitative(briefs[1].items[5])).toBe(true); // Oracle: 2.45GW
  expect(quantitative(briefs[1].items[3])).toBe(false); // Categorical 0-1-2 labels
  const synthetic = {
    ...briefs[1].items[3],
    headline: "Model 5.6 announced in 2026",
    paragraphs: [],
    means: null,
    figure: null,
  };
  expect(quantitative(synthetic)).toBe(false);
});
it("supplies complete immutable figures to the customization model", async () => {
  const { sourceCatalog } = await import("../lib/customization");
  for (const brief of briefs)
    expect(sourceCatalog(brief).items.map((i) => i.figure)).toEqual(
      brief.items.map((i) => i.figure),
    );
});
