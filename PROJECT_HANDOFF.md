# RepoRehearsal — New Chat Handoff

Use this document as the complete context for a fresh Codex chat. Do **not** paste any API keys, tokens, `.env` files, or Cloudflare secrets into a chat.

## Product summary

RepoRehearsal is an incident-response training product. A user can open a built-in demo, import a public GitHub repository, or upload a local folder/ZIP. The app analyzes a filtered source snapshot, derives a repairable incident where possible, creates an isolated rehearsal workspace, presents evidence (source, logs, DB state, health, commands, hints), validates a submitted fix, scores the work, and produces an after-action report.

The hosted product does **not** execute arbitrary uploaded code. It relies on safe, deterministic repository analysis and validation. A future hardened sandbox service is required for real arbitrary command/container execution.

## Where the project is on this laptop

```text
/Users/aryangaur/Documents/Codex/2026-07-15/files-mentioned-by-the-user-reporehearsal
```

Open that folder in an editor or use it as the working directory for all commands below.

## Public locations

- Production app: <https://reporehersal.com>
- Workers.dev fallback: <https://repo-rehearsal.aryangaur926.workers.dev>
- GitHub repository: <https://github.com/agcodin/reporehearsal>
- Cloudflare Worker name: `repo-rehearsal`
- Cloudflare account subdomain: `aryangaur926.workers.dev`
- Current deployed Worker version at handoff: `2a10e430-f526-42c6-9ffc-241cbf03fd87`
- Latest Git commit at handoff: `89592b9 Fix footer layout and editor selection alignment`

## Current deployment and storage

The app is deployed as a Cloudflare Worker through Wrangler/Vinext.

| Resource | Binding | Name / ID |
| --- | --- | --- |
| Cloudflare D1 | `DB` | `repo-rehearsal` (`d5b8308b-5874-4a6e-9c48-64a8edb4d3bb`) |
| Cloudflare R2 | `REPOSITORIES` | `repo-rehearsal-repositories` |
| OpenAI secret | `OPENAI_API_KEY` | Configured as a Cloudflare Worker secret; never commit or print it |

The connection configuration is in [wrangler.jsonc](wrangler.jsonc). The OpenAI key was configured as a Worker secret, not in the repository. Keep it that way.

## How to run locally

Requirements: Node.js 22.13+ and project dependencies installed.

```bash
cd /Users/aryangaur/Documents/Codex/2026-07-15/files-mentioned-by-the-user-reporehearsal
npm install
npm run dev
```

Open <http://localhost:3000>.

For optional local AI enhancement, make a local `.env` from `.env.example` and add your own key there. Do not commit `.env`.

## How to test and build

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

The most recently completed production verification was `npm run build`, which passed before the latest deployment.

## How to deploy to Cloudflare

Build first, then deploy while preserving all existing Cloudflare variables/secrets:

```bash
cd /Users/aryangaur/Documents/Codex/2026-07-15/files-mentioned-by-the-user-reporehearsal
npm run build
WRANGLER_LOG_PATH=.wrangler/logs npx --no-install wrangler deploy --config wrangler.jsonc --keep-vars
```

`--keep-vars` is important: it prevents deployment from removing configured secrets such as `OPENAI_API_KEY`.

Useful Cloudflare commands:

```bash
npx --no-install wrangler whoami
npx --no-install wrangler tail repo-rehearsal
npx --no-install wrangler secret list --name repo-rehearsal
```

To set or replace an OpenAI key securely, run this in an interactive terminal and paste the value only when prompted:

```bash
npx --no-install wrangler secret put OPENAI_API_KEY --name repo-rehearsal
```

Never add the key to `wrangler.jsonc`, source code, Git, screenshots, or chat messages.

## How to push changes to GitHub

The GitHub remote is `origin` → `https://github.com/agcodin/reporehearsal.git`, normally using branch `main`.

```bash
cd /Users/aryangaur/Documents/Codex/2026-07-15/files-mentioned-by-the-user-reporehearsal
git status
git add <specific-files-you-intend-to-publish>
git commit -m "Describe the change"
git push origin main
```

Important: the worktree presently contains unrelated untracked duplicate files named with ` 2` before their extension (for example `app/dashboard/page 2.tsx`). Do **not** bulk-stage with `git add .` or `git add -A` until they have been reviewed. They were intentionally excluded from the latest commit.

## Important code map

| Area | Primary location |
| --- | --- |
| Global visual system, footer, responsive styles, code-editor alignment | [app/globals.css](app/globals.css) |
| Global shell, header, footer, metadata | [app/layout.tsx](app/layout.tsx) |
| Main source editing UI | [app/components/CodeEditor.tsx](app/components/CodeEditor.tsx) |
| Repository selection/import UI | [app/repositories/page.tsx](app/repositories/page.tsx) |
| Rehearsal creation | [app/rehearsals/new/page.tsx](app/rehearsals/new/page.tsx) |
| Investigation workspace | [app/rehearsals/[id]/workspace/Workspace.tsx](app/rehearsals/[id]/workspace/Workspace.tsx) |
| Reports | [app/rehearsals/[id]/report/Report.tsx](app/rehearsals/[id]/report/Report.tsx) |
| Dashboard | [app/dashboard/page.tsx](app/dashboard/page.tsx) |
| Pricing and paid-tier UI | [app/pricing/page.tsx](app/pricing/page.tsx) |
| D1 database schema | [db/schema.ts](db/schema.ts) |
| Cloudflare resources/config | [wrangler.jsonc](wrangler.jsonc) |
| Architecture documentation | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Security model | [docs/SECURITY.md](docs/SECURITY.md) |
| Application scripts/dependencies | [package.json](package.json) |

The API route surface is under [app/api](app/api). Particularly useful areas:

- Repository import/list/upload: `app/api/repositories/`
- GitHub import: `app/api/repositories/github/route.ts`
- Rehearsal lifecycle: `app/api/rehearsals/`
- Workspace file edits, evidence, logs, commands, hints, submit/report: `app/api/rehearsals/[id]/`
- Account/profile/preferences: `app/api/account/`

## Features that have been built

- Public landing/product experience and Apple-inspired premium visual theme (black, white, space gray, restrained blue supporting color).
- Public built-in sample incidents plus a structured repository/rehearsal experience.
- Four user-facing plans: Free, Pro, Team, Enterprise; gated UI and progressively higher repository/model upload limits.
- Pricing feature comparison screen and per-plan dashboard previews.
- Curated public-repository selection experience for Pro-and-above users, with a large seeded catalog and randomization flow.
- Public GitHub URL import and local folder/ZIP upload (within safety/size limits).
- ChatGPT-only account/sign-in flow in the current deployment; the public app remains accessible without sign-in.
- D1-backed metadata/account/session state and R2-backed filtered source snapshots/workspaces.
- Repository analyzer (“brain”) that selects supported behavior boundaries from imported source and refuses to fabricate a challenge when none is safe.
- Deterministic incidents, evaluation, safety checks, 100-point scoring, reports, hypotheses, hints, code editing, logs, DB comparison, and health evidence.
- Optional OpenAI-assisted coaching/report prose through the configured Worker secret. Deterministic validation remains authoritative.
- Cloudflare Worker deployment with observability enabled.

## Known limitations and deliberate product boundaries

- The current editor is a textarea with a syntax-highlight overlay, not Monaco/VS Code itself.
- The editor cursor/selection alignment was fixed in the latest commit by matching the input/highlight origin (52px), font settings, and ligature behavior.
- No real Stripe checkout/webhook integration exists yet. Tiers are currently feature-access gates, not paid billing enforcement.
- Only ChatGPT sign-in is currently enabled. Google/GitHub OAuth is not configured. A public GitHub URL import is available without a GitHub login.
- Private GitHub repositories are not supported. `GITHUB_TOKEN` can raise rate limits for public imports but does not enable private access.
- Uploaded repositories are never executed by the hosted Worker. Building a real remote sandbox is a future separate security project.
- The service needs production safeguards before broad launch: rate limiting, abuse controls/Turnstile, analytics/error alerting, privacy/terms review, backup/retention policy, payment webhook verification, and thorough browser/device QA.

## Latest UI maintenance

The latest change (`89592b9`) did two things:

1. Reworked the footer into a responsive three-part layout (brand, status, navigation) rather than relying on generic navigation styling.
2. Fixed offset caret/text selection in repository workspaces by ensuring the transparent textarea and highlighted code layer use identical left origin, line/font metrics, ligature settings, and focus styling.

## Suggested next production milestones

1. Add real authentication session verification and account lifecycle tests.
2. Add Stripe products, Checkout, customer portal, signed webhooks, and server-side entitlement enforcement.
3. Add Cloudflare Turnstile and application-level rate limits to import/upload/AI endpoints.
4. Add monitoring and alerting around Worker errors, D1/R2 failures, OpenAI errors, and import abuse.
5. Add legal/privacy pages, data deletion requests, retention controls, and support contact details.
6. Test all main user paths on desktop/mobile and with keyboard/screen reader support.
7. If real repository execution is required, design a hardened isolated sandbox service before enabling it; do not run arbitrary uploaded code in the Worker.
8. Consider Monaco only if the current focused textarea editor becomes limiting; retain the overlay approach unless richer IDE features are needed.

## Safe prompt for a new Codex chat

Paste this document, then say:

> We are continuing RepoRehearsal. Read `PROJECT_HANDOFF.md` in the repository first. Work only in `/Users/aryangaur/Documents/Codex/2026-07-15/files-mentioned-by-the-user-reporehearsal`. Preserve Cloudflare secrets, never expose API keys, and avoid staging the untracked duplicate files ending in ` 2`. Please inspect the current code and continue with: [describe the next task].
