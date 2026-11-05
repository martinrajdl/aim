---
name: aim-brief-ui
description: Refine Aim's editorial brief layout, source adapter and figures. Use for fixture rendering, responsive hierarchy, evidence presentation and visual verification.
---

# Aim brief UI

Each supplied brief belongs to a different reader. Keep each reader’s reporting and business context together. Reviewers switch examples through `/sitemap`; there is no cross-persona homepage or category navigation. See [DECISION-LOG.md](../../../DECISION-LOG.md).

## Source rules

- Use unchanged JSON fixtures as acceptance data; label synthetic test variants. Read `recap.doc`, join citations/scopes by ID, and fall back from a blank subject to verdict. Text is plain text, not Markdown.
- Derive item identity from recap ID and original source index before sorting. Signal IDs are not item identity.
- Stable tier/source order is `detail`, `brief`, `one_liner`. The grid deliberately promotes items using `lib/grid.ts`; that authored order is not an API relevance ranking.
- Item and current status are independent. New-only filtering uses item status, not dates. Preserve the whole-week verdict when filtering; do not rewrite it for the subset.
- `item.current` references a current label. Null/unmatched currents remain reachable. Missing scope means Other, a separate concept.

## Figures and sources

Dispatch on `figure.block.t`: timeline, chart, table, comparison. Verify all nine supplied figures when changing shared figure handling.

- Timelines retain historical points; freshness comes from `fresh_update_ids`.
- Bar charts preserve labels, units, values, highlighting, notes and qualifications. Use a zero baseline for supplied positive values; handle a null maximum.
- Tables use semantic headers and original strings. Empty means unspecified, not No. Numeric strings are not necessarily comparable metrics.
- Comparison sides retain their names and independent lists. `us` does not imply the reader's company; point counts can differ.
- Current-scoped figures describe the whole thread. Label that context and keep it reachable if filters hide its host item.
- Preserve curated `read_update_ids` order. Construct Aim object links from supplied IDs; use generic labels only where metadata is absent.
- Preserve and disclose the enterprise citation-title mismatch. Do not invent corrections or derive confidence scores from source counts.

## Composition and interaction

Use the approved news-media hierarchy for the active brief: lead story, supporting updates, compact remaining updates and a focused article. Surface supplied implications to explain business relevance. Avoid invented relevance copy, decorative stock imagery and unnecessary helper remarks.

Aim and the date sit on the left of the header, with Personalize on the right. There are no category tabs or left navigation sidebar. Articles provide return and previous/next navigation within their brief.

The shell fits the viewport. Reading, evidence and chat expand or scroll internally. Make the grid respond to available reading-column width, including when chat is open. At mobile widths use a single-column list with all eligible items, not a squeezed desktop layout or a second view toggle. Preserve source order/grouping semantics and clear article links.

Personalization is primarily chat, with suggested messages and removable applied pills. Show a pill's removal action on hover/focus and keep it discoverable on touch. One global profile applies to every demo; do not add scope labels or persona selectors to the panel.

Use shared palette and typography tokens, self-hosted Geist/Geist Mono, an 8px spacing rhythm, visible hover states and one focus outline. Keep `/design` and `/wireframe` aligned with current components and preserve font licensing.

Verify each reader separately, all figure types, empty filters, title fallback and keyboard access. Check large/small desktop, tablet and narrow/zoomed screens with chat open/closed. Save process captures outside the repository. Use the preserved original AI-built screen for show-and-tell; do not manufacture a new before screen or call an untested design choice a measured improvement.
