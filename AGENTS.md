<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- Preserve the current product design when refactoring. Preview redesigns separately.
- Keep the README focused on app users. Put technical documentation in `docs/`, `CONTRIBUTING.md` and `DEPLOY.md`.
- Validate external election data before display or notification. Missing pending electorate must never be treated as zero.
- Keep personal preferences and notebook entries in the browser; do not introduce political profiling or telemetry.
- Add focused tests when changing parsing, election rules, database concurrency or push delivery.
- Run `npm run format`, `npm run check` and `npm run build` before publishing changes.
- Never commit credentials, local databases, build output or notification subscription details.
