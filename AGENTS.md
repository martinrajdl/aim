# Aim brief application

Maintain the approved editorial brief, article reader and customization chat. Each sample is a different reader's brief; reviewers switch demonstrations through `/sitemap`, not product category tabs. Use one global browser-local preference profile across the demos. The stack is Next.js and TypeScript with the Vercel AI SDK and the assignment's Azure deployment. Read `DECISION-LOG.md` for current product rationale and superseded decisions.

Use the local project skills when relevant:

- `.agents/skills/aim-brief-ui/SKILL.md` for the brief's data adapter, layout, figures, and visual verification.
- `.agents/skills/aim-view-config/SKILL.md` for natural-language configuration, validation, persistence, and model failure handling.
- `.agents/skills/aim-nextjs-app/SKILL.md` for the final application shell, HTTP loaders, shared state and validation workflow.

Keep submitted prompts and meaningful validation cases inspectable. Record consequential decisions in `DECISION-LOG.md`; label hypotheses and unmeasured targets honestly. Design-process captures and private research belong outside this submission. Keep generated evaluation results in ignored `test-results/`.

Only deliberate submission material belongs in this directory. Keep credentials in ignored local environment files; include placeholders only in `.env.example`. Do not copy raw hiring correspondence, a saved mailbox page, private research, or account identifiers into the submission.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
