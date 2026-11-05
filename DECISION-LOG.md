# Aim brief · Product and implementation decisions

Updated 5 November 2026.

This log explains the choices behind the submission, including a corrected interpretation of the sample data. Design assumptions have not yet been validated with representative readers.

## 1. Treat each sample as a different reader’s brief

**Decision.** The space launch, enterprise AI and Czech/Slovak AI samples belong to three different people with different business contexts. Each demonstration opens directly into that person’s brief. The reader’s original subject, verdict, implications, monitoring areas and evidence remain together.

An early combined homepage treated the samples as one person’s interests. That interpretation was corrected: the cross-persona homepage and category tabs were removed. [`/sitemap`](app/sitemap/page.tsx) is the launch and review entry point; `/` redirects there. Reviewers choose a demonstration without making persona switching part of the product journey. Explicit `market` links still open the chosen brief directly.

**Consequence:** Do not combine unrelated readers’ reporting or imply that an update’s business implications apply to everyone. The demonstration selector is not an account system.

## 2. Use editorial hierarchy to make a substantial brief compact

**Decision.** News media, particularly the New York Times and Business Insider, informed the lead story, supporting updates and focused article reader. The business-intelligence distinction comes from the supplied implications, monitoring context, currents and evidence.

The [feature order](lib/grid.ts) is authored and inspectable. Visual prominence is not an Aim-provided ranking or a learned relevance score. Filtering must preserve access to every eligible update, including items outside the featured positions.

**Tradeoff:** Hierarchy gives the reader a starting point but introduces editorial judgment. Test whether representative readers can scan, understand and investigate the week effectively before treating this as a validated ranking strategy.

## 3. Keep the reading journey within the viewport

**Decision.** The journey is brief → article → back to brief. Aim and the edition date sit on the left of the header; Personalize opens an adjacent chat panel from the right. Articles retain previous/next navigation within the active brief.

The application shell fits the viewport. Reading, evidence and chat scroll or expand within bounded areas. Desktop and tablet use an editorial grid sized to the available reading area; mobile uses a single-column list of the same eligible updates. On narrow screens, reading and chat use one active panel.

Grouping changes the presentation of the current brief. There is no separate top-level List, Threads or Synthesis mode, and no left navigation sidebar. The mobile list is responsive behavior, not another saved preference.

## 4. Extend Aim’s identity into a working product

**Decision.** The supplied email informed the restrained palette and typography. Its layout was adapted for the web, with an 8px spacing rhythm, consistent borders and radii, limited elevation, clear hover states and a single focus outline. Attio informed compact interface controls; article text retains its own reading scale.

Shared components and [tokens](styles/design-tokens.css) power the unlinked `/design` reference, including actual controls, evidence rendering and the blue orb loader. Fonts are self-hosted Geist and Geist Mono. The [annotated wireframe](app/wireframe/page.tsx) explains the current application rather than preserving superseded navigation.

## 5. Preserve authored reporting and provenance

**Decision.** The three JSON fixtures remain unchanged. Headlines, verdicts, paragraphs, implications, figures and citations come from them. Navigation labels, editorial placement and source-backed organization matches are presentation choices.

The adapter distinguishes item status from current status, falls back to verdict when subject is blank, and retains original source indices for article links. All four supplied figure types are supported. Historical timeline points and thread-wide figures remain context under new-only filtering. Blank table cells remain unspecified.

**Known issue:** One enterprise citation title conflicts with the story associated with its ID. The reader discloses the mismatch instead of inventing a correction. Preserving a claim does not mean independently verifying it.

## 6. Use a real HTTP boundary in one application

**Decision.** Next.js, TypeScript, Tailwind and owned shadcn-style/Radix primitives support the application. Route Handlers expose a server-side fixture repository through an API, with browser loading, validation, retry and cancellation.

**Tradeoff:** One process keeps the exercise easy to run while preserving a service boundary. A second server, database or packaged component library would add operational scope before solving a demonstrated need.

## 7. Ask the model for configuration, not replacement reporting

**Decision.** The Vercel AI SDK and Azure deployment translate requests into a constrained [ViewConfig](lib/view-config.ts), or a clarification/unsupported result. The [prompt](prompts/configure-brief.md) is in the repository. Application code validates structure and source membership before applying a complete result.

**Why:** Configuration is inspectable, persistable and reversible. It preserves the supplied facts and attribution. Rewritten reporting would introduce factual risk; generated UI would weaken consistency and validation. A valid schema still cannot prove that an ambiguous request was understood correctly.

“Numbers first” promotes existing quantities rather than inventing calculations. Company grouping uses literal source mentions, not inferred competitor relationships. Unsupported requests leave the view unchanged.

## 8. Make personalisation global and primarily conversational

**Decision.** There is one preference profile in this browser. It is not keyed by persona, and switching reader demonstrations does not change it. This supersedes both the earlier per-brief configuration and the proposed global-reading/per-brief-content split.

Chat is the primary interface. Suggestions behave as prewritten requests, using the same model path as typed input. Applied preference pills describe the current settings. They can be removed individually, or cleared together to restore the default design. Editing remains available through chat. Removal is also accessible by keyboard and touch, not only hover.

A content preference can leave another sample with no matching updates. The reader shows that state honestly rather than quietly widening the filter. Global scope is a presentation preference for this local demonstration, not shared data between real customers.

## 9. Separate active preferences from conversation history

**Decision.** The validated global configuration and completed chat history survive reload. History records earlier requests and is never replayed as active settings. Clearing preferences keeps history; undo and in-flight work remain session-only.

The browser restores the validated configuration from `localStorage` while loading the supplied reporting from the source API. Initial loading, navigation and reload require no model call. This persistence stores configuration rather than raw model responses; there is no offline source-data cache, so a new load still needs the source API.

Requests are bound to configuration revision and source identity so late results cannot overwrite a reset or later edit. The current brief stays readable during a model request. Failures and timeouts retain the last valid configuration, with an explicit Retry action and no automatic retry. Cancel, preference removal and reset invalidate in-flight responses. Storage failures leave the current reading state usable and disclose when changes cannot be saved.

Migration preserves old records and promotes only reading fields that agree across all three earlier profiles. Conflicting fields return to their defaults with a notice; local content filters are not promoted into global intent. The global source fingerprint set guards source-bound selections: when the supplied source changes, reading preferences remain and stale content selections clear with a notice.

**Limit:** Persistence is browser-local. Future editions require fresh source validation; accounts and cross-device synchronization are outside this exercise.

## 10. Keep scope and evidence honest

**Boundary.** This is a reader for one supplied weekly snapshot, with real model integration. It does not imply live ingestion, daily editions, inferred business relationships or production account infrastructure.

Deterministic tests check rendering and configuration behavior. A separate paid live-evaluation script checks integration; a small sample does not establish general model reliability. Browser review checks responsive layout and interaction, not usability outcomes with business users.

**Next:** Explore how readers' text preferences can guide relevance and grid composition: story order, prominence, reading depth and which figures appear upfront. Prototype within the existing design system and test with intended business readers whether the resulting hierarchy is useful, understandable and stable across screen sizes, including when preferences compete. This is a proposed direction, not an implemented relevance model. Broaden intent evaluation, obtain first-party organization relationships and resolve the source mismatch. Add authenticated persistence and shared request limits before offering a public paid-model experience.
