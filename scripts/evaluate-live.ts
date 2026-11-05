import { mkdir, writeFile } from "node:fs/promises";
import { defaultView, orderedItems, type ViewConfig } from "../lib/view-config";
import {
  validateOutcome,
  type Outcome,
  type CustomizationRequest,
} from "../lib/customization";
import { normalizeBrief, briefKeys } from "../lib/brief";
import { sourceSnapshot } from "../lib/storage";
const origin = process.env.AIM_BASE_URL || "http://127.0.0.1:3000";
const briefs = await Promise.all(
  briefKeys.map(async (key) => {
    const response = await fetch(`${origin}/api/briefs/${key}`);
    if (!response.ok) throw Error(`Could not load ${key}`);
    const source = await response.json();
    return normalizeBrief(key, source.envelope, source.fingerprint);
  }),
);
const results: {
  request: string;
  status: number;
  outcome: string;
  passed: boolean;
  elapsedMs: number;
  config?: ViewConfig | null;
}[] = [];
async function trial(
  request: string,
  check: (outcome: Outcome) => boolean,
  config = defaultView,
  clarification?: CustomizationRequest["clarification"],
) {
  const start = performance.now();
  const response = await fetch(`${origin}/api/customize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      revision: 0,
      request,
      config,
      sources: sourceSnapshot(briefs),
      clarification,
    }),
  });
  const body = await response.json();
  let outcome: Outcome | undefined,
    passed = false;
  try {
    outcome = validateOutcome(body.outcome, briefs);
    passed = response.ok && check(outcome);
  } catch {}
  const record = {
    request,
    status: response.status,
    outcome: outcome?.outcome || "error",
    passed,
    elapsedMs: Math.round(performance.now() - start),
    config: outcome?.config,
  };
  results.push(record);
  console.log(JSON.stringify({ ...record, config: undefined }));
  return outcome;
}
const applied = (o: Outcome, check: (c: ViewConfig) => boolean) =>
  o.outcome === "apply" && o.config !== null && check(o.config);
await trial("Show only new updates and hide the one-liners", (o) =>
  applied(
    o,
    (c) =>
      c.freshness === "new" &&
      !c.tiers.includes("one_liner") &&
      JSON.stringify(briefs.map((b) => orderedItems(b, c).length)) ===
        "[5,3,0]",
  ),
);
if (!process.argv.includes("--smoke")) {
  const request =
    "Group only my competitors by company and hide the one-liners.";
  const first = await trial(
    request,
    (o) => o.outcome === "clarify" && o.reason === "choose_organizations",
  );
  if (first?.outcome === "clarify")
    await trial(
      "SpaceX and Blue Origin",
      (o) =>
        applied(
          o,
          (c) =>
            c.groupBy === "company" &&
            !c.tiers.includes("one_liner") &&
            JSON.stringify(c.organizationIds?.slice().sort()) ===
              JSON.stringify(["Blue Origin", "SpaceX"]),
        ),
      defaultView,
      { requests: [request], reason: "choose_organizations" },
    );
  await trial(
    "Only show updates that mention Salesforce, including mentions in their tables",
    (o) =>
      applied(
        o,
        (c) =>
          JSON.stringify(briefs.map((b) => orderedItems(b, c).length)) ===
          "[0,1,0]",
      ),
  );
  await trial(
    "Make it compact",
    (o) => applied(o, (c) => c.density === "compact" && c.freshness === "new"),
    { ...defaultView, freshness: "new" },
  );
  await trial("Put numbers first", (o) =>
    applied(o, (c) => c.emphasis === "numbers_first"),
  );
  await trial(
    "Also hide the one-liners",
    (o) =>
      applied(
        o,
        (c) =>
          c.freshness === "new" &&
          c.emphasis === "numbers_first" &&
          !c.tiers.includes("one_liner"),
      ),
    { ...defaultView, freshness: "new", emphasis: "numbers_first" },
  );
  await trial(
    "Show all updates",
    (o) =>
      applied(
        o,
        (c) =>
          c.freshness === "all" &&
          c.tiers.length === 3 &&
          c.organizationIds === null &&
          c.density === "compact" &&
          c.groupBy === "company",
      ),
    {
      ...defaultView,
      freshness: "new",
      tiers: ["detail"],
      organizationIds: ["Microsoft"],
      density: "compact",
      groupBy: "company",
    },
  );
  await trial(
    "Add a revenue forecast for next year and hide one-liners",
    (o) => o.outcome === "unsupported" && o.config === null,
  );
  await trial(
    "Reset everything to the default presentation",
    (o) => applied(o, (c) => JSON.stringify(c) === JSON.stringify(defaultView)),
    {
      ...defaultView,
      density: "compact",
      freshness: "new",
      organizationIds: ["Microsoft"],
    },
  );
}
await mkdir("test-results", { recursive: true });
await writeFile(
  process.argv.includes("--smoke")
    ? "test-results/live-smoke-evaluation.json"
    : "test-results/live-evaluation.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      provider: "Azure via Vercel AI SDK",
      scope: "One global profile",
      trials: results,
    },
    null,
    2,
  ) + "\n",
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
