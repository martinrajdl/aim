# Aim · The personal brief

A viewport-sized market intelligence reader built with Next.js, TypeScript and the Vercel AI SDK. Each reader opens an editorial brief, then follows an update into its supporting analysis and evidence. Chat changes how the supplied reporting is presented without rewriting its facts or figures.

The three unchanged samples are **three different briefs for three different people**: a European launch provider, a San Francisco founder raising a round, and a founder in Czechia and Slovakia. They are separate demonstrations of the same product, not categories in one combined news feed. Use [`/sitemap`](http://127.0.0.1:3000/sitemap) to switch demonstrations during review.

## Run locally

Requires Node.js 22+ and npm. For a fresh checkout:

```sh
npm ci
cp .env.example .env.local
# Set AZURE_OPENAI_API_KEY in .env.local.
npm run dev
```

**Start at [localhost:3000/sitemap](http://127.0.0.1:3000/sitemap).** This is the review entry point: choose one of the three readers, then open their brief. Opening `/` also redirects to `/sitemap`. The same entry point applies to `npm start` after a production build.

Keep an existing `.env.local` when resuming work. Reading, removing applied preferences and resetting work without a key; natural-language requests need the Azure credential, which stays on the server. The default deployment is `gpt-5-mini-hiring`, configurable through the environment template.

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm run eval:live` separately exercises the real, paid model through a running local server. Results go to ignored `test-results/`, with timings and outcome categories. Set `AIM_BASE_URL` to use another local port.

## Explore

| Route                   | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `/sitemap` (or `/`)     | Start here: all three reader demonstrations and reference pages |
| `/?market=space`        | Brief for a European launch provider                            |
| `/?market=enterprise`   | Brief for a San Francisco founder raising a round               |
| `/?market=czsk`         | Brief for a founder in Czechia and Slovakia                     |
| `/?market=space&item=5` | Article, addressed by its original source index                 |
| `/design`               | Shared tokens, controls, figures and loading animation          |
| `/wireframe`            | Annotated application structure and interaction rationale       |

The product has no cross-persona homepage, category tabs or left navigation sidebar. The header places Aim and the supplied edition date on the left, with Personalize on the right. Articles provide Back to brief and previous/next navigation. The editorial grid adapts to available desktop and tablet space, becoming a single-column list on mobile. Desktop chat sits beside the brief; narrow screens show one active panel.

The reference pages are unlinked from product navigation, not access controlled. The `market` query parameter selects a sample for review; it does not represent an account or a separate preference profile.

For a short review, open a brief, follow a story into its evidence, then use Personalize to try “only new this week” or “numbers first.” Reload to check persistence, remove an applied pill or use Clear all, then return to `/sitemap` for another reader. Preferences are shared across these demonstrations; Clear all gives each sample its original presentation.

## Personalisation

One browser-local preference profile applies everywhere, including when a reviewer switches sample readers. Chat is the primary interface. Suggested requests are ready-to-send messages. Applied preferences appear as pills: use chat to change them, remove an individual pill, or clear all preferences to restore the default design.

The [configuration contract](lib/view-config.ts) covers freshness, reading depth, emphasis, grouping, density and source-backed content selection. A global content filter can legitimately produce no matches in another sample; switching demonstrations does not silently clear it or substitute unrelated reporting.

Completed chat history persists separately and is never replayed as configuration. Reset retains conversation history. Undo and requests still in flight are session-only. Storage failures leave the current reader usable and report when changes cannot be saved. There are no accounts or cross-device synchronization.

Reload restores the validated configuration from `localStorage` and fetches the supplied reporting from the source API. Reading still requires that API; the browser does not keep an offline copy of the briefs. Loading, navigation and reload do not call the model. Persistence saves the configuration, not a cache of raw model responses.

## Architecture

```text
Supplied JSON → server repository → HTTP loader → immutable source
                                                      +
                                       global ViewConfig → React projection
                                                      ↑
Chat → POST /api/customize → Azure / Vercel AI SDK → validated configuration
```

Next.js Route Handlers provide a real API boundary without a second server. The [source adapter](lib/brief.ts) preserves original text and joins citations/scopes. The [grid hierarchy](lib/grid.ts) is an explicit design choice, not a generated relevance score.

The [model prompt](prompts/configure-brief.md) is inspectable. `generateText` with `Output.object` returns a complete configuration, clarification or unsupported outcome. [Schema and source-membership checks](lib/customization.ts) run before an atomic update. The model cannot supply replacement reporting, figure values, links or executable UI. Failure, cancellation and stale results preserve the last valid configuration.

Only an explicit chat request or Retry calls the model. While it is slow, the current brief remains readable. A failed or timed-out request retains the previous configuration and is not retried automatically. Cancel, removing a preference and reset invalidate any response still in flight.

## Validation and limits

The supplied data contains 36 updates and nine figures across timeline, bar chart, table and comparison. Tests cover source preservation, figure rendering, configuration validation, persistence, clarification, failures and stale responses. Browser checks complement those tests for responsive layout and interaction. Live evaluation is a small integration sample, not a reliability benchmark.

- The data covers one supplied week; there is no live ingestion or daily/monthly edition.
- One enterprise citation title conflicts with the story using its ID. The app preserves both and discloses the mismatch.
- Organization matching uses a curated catalog of literal source mentions, including figures. It does not infer competitors or corporate relationships.
- Source-bound selections are validated against supplied data. Applying preferences to a future edition would require renewed source validation.
- Remote paid customization requires a server-side `AIM_CUSTOMIZE_TOKEN` and matching bearer authorization. A hosted product needs user authentication and a shared rate limiter.

Fonts are self-hosted Geist and Geist Mono under the [SIL Open Font License](public/assets/Geist-OFL.txt). The Aim favicon is retained from the visual reference. Private research, correspondence and design-process captures are outside this submission.

See [DECISION-LOG.md](DECISION-LOG.md) for product reasoning, tradeoffs and next steps.

## With another week

With another week, I'd focus on relevance and how it shapes the grid. I'd explore how preferences expressed in text could influence story order, prominence, reading depth and which figures appear upfront. A request like “prioritise funding news, keep product updates short and show me the numbers” gives us more to work with when deciding how to present the brief.

I'd prototype those layout decisions within the existing design system, keeping the original reporting intact and the result predictable across screen sizes. Then I'd test with business readers whether the grid brings the right information forward, how well it handles competing preferences, and whether people understand why the presentation changed. That would help establish where more personalisation is useful and where a stable reading layout matters more.
