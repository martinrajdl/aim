---
name: aim-nextjs-app
description: Maintain Aim's Next.js shell, HTTP loaders, global reading state and reviewer reference pages. Use for application architecture, navigation or persistence changes.
---

# Aim Next.js application

Read [DECISION-LOG.md](../../../DECISION-LOG.md) for product rationale. Paths below are relative to the repository root.

## Application boundaries

- Each supplied JSON is a separate reader’s brief. Do not combine them into a shared homepage or present them as one person's categories.
- `components/brief/brief-app.tsx` owns the shell. The root route redirects to `/sitemap` unless a valid `market` selects a reviewer demonstration; `item` selects an original source index. Launch and review start at `/sitemap`. Product navigation is brief → article → back to brief.
- Persona switching belongs only in `/sitemap`. Keep the primary UI free of category tabs, persona selectors and the old left sidebar. Aim/date sit on the left and Personalize stays on the right. Mobile needs no extra category-navigation header row.
- `lib/use-workspace.ts` owns loading, global preferences, cancellation and undo. The displayed brief changes with navigation; preferences and chat do not become persona-specific.
- `lib/server/brief-repository.ts` reads allowlisted fixtures. `lib/brief.ts` validates and normalizes without rewriting source content. Keep credentials out of client imports.
- `lib/grid.ts` contains authored prominence, not learned relevance. Use available reading space well; every eligible update must remain reachable. Mobile is a single-column list of the same data, not a separate saved reading mode.

## Global preferences

Persist one validated preference profile in browser localStorage, with no persona namespace. Rendering may derive brief-specific projections from the shared configuration; do not persist independent settings behind those projections.

Chat, suggested requests, applied pills and reset act on that same profile. A filter may legitimately leave another demonstration empty. Do not widen it automatically. Keep source membership checks and invalidate source-bound selections when their source is no longer valid.

Migration must not guess between conflicting per-brief reading preferences or silently turn old local content filters into global intent. Preserve legacy records and explain any incompatible settings that were not migrated.

`lib/chat-history.ts` validates completed exchanges separately. Restore them without replaying requests or applying historical configurations. Preference reset keeps history; undo and in-flight work remain session-only. Guard storage access and report session-only behavior if saving fails.

## Design and verification

Preserve shared tokens: 8px spacing rhythm, single focus outline, reduced-motion behavior, compact desktop controls and touch-sized actions. Keep reading typography independent of control density. Chat sits beside the reader on desktop; narrow screens use one active panel.

`/design` demonstrates current components, tokens and loading. `/wireframe` explains the current journey. `/sitemap` indexes all three reader demonstrations and references. These are not access-controlled routes; avoid keeping removed product modes alive only as reference examples.

Run `npm run typecheck`, `npm test` and `npm run build` after implementation changes. Verify large/small desktop, tablet and mobile, including chat open. Use `npm run eval:live` for model integration changes, not routine style work; it makes paid calls and writes ignored `test-results/` output.

Only deliberate submission material belongs here. Keep research/process captures outside the repository and environment values in ignored `.env.local`. Preserve bundled font licensing. Update the decision log when product direction changes. Do not initialize Git, deploy or publish without the user's instruction.
