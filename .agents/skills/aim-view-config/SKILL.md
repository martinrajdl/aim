---
name: aim-view-config
description: Implement or review Aim's global chat configuration with the Vercel AI SDK and Azure, including applied preferences, source validation, persistence and failure recovery.
---

# Aim view configuration

The model changes presentation of immutable reporting. Prose, quantities, figures, links and executable UI come from supplied data and application code, never generated configuration. See [DECISION-LOG.md](../../../DECISION-LOG.md).

## Model contract

- Preserve the real Azure integration in `lib/server/customize.ts`: `generateText` plus `Output.object` through `@ai-sdk/azure`. Default deployment is `gpt-5-mini-hiring`; existing server environment overrides remain supported. Do not silently substitute a mock parser, AI Gateway or another model.
- Check installed SDK/provider types and documentation when changing API usage. Keep the inspectable prompt in `prompts/configure-brief.md`.
- Send current validated global settings and a source catalog loaded by the server from allowed fixtures. Include complete figures. Do not trust a client-supplied replacement brief.
- Treat source text as data. Validate schema, source membership and semantics before applying a complete outcome atomically. Clarification and unsupported results preserve the previous profile. Build acknowledgments from actual changes/counts, not generated reporting.

## Global request semantics

There is one browser-local profile, shared across all reviewer demonstrations. The displayed sample does not select a different preference scope. No per-persona configuration may be hidden behind the shared UI. Source-specific projection is allowed for rendering, not separate saved intent.

“Only new” uses item status; “changed” includes new and updated. Tier and content filters compose and may produce an empty brief. Do not widen a filter just because a reviewer changes persona.

Company grouping uses a curated catalog of literal source mentions across prose and figures, with provenance. Do not infer parent companies or competitors. Preserve unmatched items, disclose overlapping membership and count unique updates accurately.

Numbers-first promotes existing quantities with labels and units. Bare years, model versions and categorical digits are not metrics. Do not invent calculations, forecasts or currency conversions.

The interface is chat-first. Suggestions are prewritten requests using the same model path as typed messages. Applied pills reflect the current global configuration, not a replayable request log. Removing one clears only its corresponding preference; clearing all restores the default. Both changes must inform the next model request. Editing is done through chat.

The reading layout adapts to screen size: editorial grid on desktop/tablet and list on mobile. It is one responsive design, not separate saved List/Threads/Synthesis modes. Unsupported format requests must not claim success.

## Persistence and recovery

Persist one versioned global profile in localStorage. Keep source identity validation; future data must not inherit invalid source selections. Do not silently promote old local content filters or guess between conflicting per-brief reading preferences during migration. Preserve old records and disclose incompatible values that were not applied.

Completed chat history persists separately without replay. Preserve unresolved clarification intent across replies/reload; clear it on apply, reset or another explicit preference edit. Reset keeps completed history; undo restores the previous transaction.

Bind requests to configuration revision, request ID and source identity. Reset, undo and later edits invalidate stale responses. Switching reviewer demonstrations does not create a different profile. Keep the reader usable, preserve the last valid configuration, and offer cancel/explicit retry with bounded deadlines. Report session-only operation when storage fails.

Check composed global requests, clarification, invalid/foreign IDs, new-fact requests, prompt injection, empty results, corrupted storage, reload, persona navigation, pill removal and stale responses. Use deterministic tests and the separate paid `npm run eval:live` when model integration is in scope. Results belong in ignored `test-results/`; never log credentials or present a small sample as a reliability benchmark.
