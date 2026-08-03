# RepoRehearsal — Claude Handoff

This document is the working guide for continuing RepoRehearsal. It is written for Claude (or another coding assistant) taking over the project.

## 1. What this product is

RepoRehearsal is a production-incident practice platform. A user starts from a built-in sample, a public GitHub repository, an uploaded folder/ZIP, or a curated repository. The app creates a safe rehearsal copy, introduces a controlled fault, guides the user through investigation, and grades the submitted repair deterministically.

The important product promises are:

- Original repositories are never modified.
- Source is handled as an isolated, temporary workspace.
- Secrets and environment values are redacted or excluded.
- Scores come from defined checks, edit detection, evidence, verification, and regression penalties—not a random model score.
- AI improves report wording only; it must not change the deterministic outcome.

## 2. Where everything lives

### Local checkout

```text
/Users/aryangaur/Documents/Codex/2026-07-15/files-mentioned-by-the-user-reporehearsal
```

Open that directory in your editor before making changes.

### Source control

- GitHub repository: <https://github.com/agcodin/reporehearsal>
- Branch used for releases: `main`
- Latest known release commit when this handoff was written: `e7936ac`

### Production sites

- Primary production domain: <https://reporehersal.com>
- Cloudflare Worker fallback: <https://repo-rehearsal.aryangaur926.workers.dev>
- Cloudflare Sites mirror: <https://reporehearsal-demo-2026.aryangaur926.chatgpt.site>

### Cloudflare resources

- Worker: `repo-rehearsal`
- D1 database: `repo-rehearsal`
- D1 database ID: `d5b8308b-5874-4a6e-9c48-64a8edb4d3bb`
- R2 bucket: `repo-rehearsal-repositories`
- Sites project ID: `appgprj_6a57337e1db08191a192c8b6325c5b7b`

The durable binding configuration is in `wrangler.jsonc`. The Sites logical bindings and project ID are in `.openai/hosting.json`.

## 3. What to install and access

Install or make sure you can access:

1. Node.js 22.13 or newer.
2. npm.
3. Git.
4. A GitHub account with write access to `agcodin/reporehearsal`.
5. A Cloudflare account with access to the Worker, D1 database, R2 bucket, and Sites project above.
6. Cloudflare Wrangler authentication (`npx wrangler whoami` should succeed).
7. An OpenAI API key if you want AI-enhanced report coaching.
8. Google and GitHub OAuth applications if you want those sign-in paths enabled for regular users.

From the project directory, install dependencies with:

```bash
npm install
```

Wrangler is already a development dependency, so use `npx wrangler` rather than depending on a global install.

## 4. Required secrets and OAuth configuration

Never place real secrets in source files, Git commits, screenshots, or this document. Configure secrets in Cloudflare instead.

| Secret | Purpose | Required? |
| --- | --- | --- |
| `OPENAI_API_KEY` | Enhances wording in the after-action report | Optional |
| `OPENAI_MODEL` | Overrides the default `gpt-5.6-sol` report model | Optional |
| `GOOGLE_OAUTH_CLIENT_ID` | Google login | Optional |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google login | Optional |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub login | Optional |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub login | Optional |
| `GITHUB_TOKEN` | Public GitHub import API fallback/rate-limit headroom | Optional |
| `CLEANUP_SECRET` | Protects the internal workspace-cleanup endpoint | Recommended |

Set a production secret interactively, for example:

```bash
npx wrangler secret put OPENAI_API_KEY
```

For OAuth, register these callback URLs in each provider dashboard:

```text
https://reporehersal.com/auth/google/callback
https://reporehersal.com/auth/github/callback
```

If using another domain, add matching callback URLs for that domain too. Do not change provider callback handling without checking `src/auth/oauth-providers.ts`.

## 5. How the application works

### Main user journeys

- **Practice:** `/rehearsals/new` creates a rehearsal from a sample or repository.
- **Repository import:** `/repositories` supports public GitHub links, local uploads, and curated public repositories after sign-in.
- **Daily mode:** `/daily` hosts the shared Challenge of the Day and leaderboard. The first scored completion counts; retries are practice-only.
- **Workspace:** `/rehearsals/[id]/workspace` is the code/evidence/command experience.
- **Report:** `/rehearsals/[id]/report` presents deterministic grading, prevention guidance, and optional AI coaching.
- **Teams:** `/team` supports memberships, assignments, score review, and analytics.
- **Custom incident authoring:** `/team/studio` is the Team-aware authoring entry. `/team/studio/demo` is the public read-only demonstration.
- **Recruiting:** `/recruiting` creates timed candidate debugging screens. `/screen/[token]` is the candidate-facing route.
- **Public results:** `/verify/[id]` is a shareable verified result page.

### Source map

| Area | Primary files |
| --- | --- |
| Site shell/navigation | `app/layout.tsx`, `app/components/MobileNavigation.tsx`, `app/globals.css`, `app/spec.css`, `app/deco.css` |
| Home/pricing | `app/page.tsx`, `app/pricing/PricingClient.tsx`, `src/billing/plans.ts` |
| Rehearsal engine | `src/rehearsals/session-service.ts`, `src/rehearsals/scenarios.ts`, `src/rehearsals/submission-score.ts`, `src/evaluation/scoring.ts` |
| Generated repository incidents | `src/incidents/brain.ts`, `src/incidents/quality.ts`, `src/incidents/custom-incidents.ts` |
| Repository import/analysis | `src/repositories/repository-service.ts`, `src/repositories/github/importer.ts`, `src/repositories/upload/analyzer.ts`, `src/repositories/curated-catalog.ts` |
| Teams and analytics | `src/team/team-service.ts`, `src/analytics/rehearsal-analytics.ts`, `app/team/TeamWorkspace.tsx` |
| Recruiting | `src/recruiting/recruiting-service.ts`, `app/recruiting/RecruitingWorkspace.tsx`, `app/screen/[token]/CandidateScreen.tsx` |
| Authentication | `src/auth/auth-service.ts`, `src/auth/oauth-providers.ts`, `app/auth` |
| AI report enhancement | `src/ai/report-enhancer.ts`, `src/ai/prompts` |
| Cloudflare runtime/storage | `worker/index.ts`, `src/storage/runtime.ts`, `wrangler.jsonc` |
| Database migrations | `drizzle/` |
| Tests | `tests/unit/`, `tests/integration/`, `tests/e2e/` |

### Data and persistence

- D1 stores accounts, repositories, rehearsal sessions, teams, custom incidents, recruiting screens, analytics, and public results.
- R2 stores temporary repository/workspace data.
- D1 migrations are committed in `drizzle/`. Apply migrations remotely before relying on a schema change in production.
- The Worker runtime is `worker/index.ts`; Vinext builds the app into `dist/` before deployment.

## 6. Local development and validation

Start development:

```bash
npm run dev
```

The normal local URL is `http://localhost:3000`.

Run checks before every release:

```bash
npm run typecheck
npm test
npm run audit:incidents
npm run build
WRANGLER_LOG_PATH=.wrangler/wrangler.log npx wrangler deploy --dry-run
```

Important: keep `nodejs_compat` only in `wrangler.jsonc`. It was previously duplicated in the Vite local override, which prevented the local worker runtime from starting.

## 7. How to release safely

The project convention from prior work is: every intentional edit is committed, pushed to GitHub, and deployed to both the Worker and Sites mirror.

### GitHub

```bash
git status -sb
git add <only the files you changed>
git commit -m "Describe the change"
git push origin main
```

Do not use destructive Git commands such as `git reset --hard`. Do not stage unrelated changes in a dirty worktree.

### D1 migration changes

After adding a migration in `drizzle/`, review it, then apply it remotely:

```bash
WRANGLER_LOG_PATH=.wrangler/wrangler.log npx wrangler d1 migrations apply repo-rehearsal --remote
```

Only do this after confirming the target database and the migration are correct.

### Primary Worker deployment

```bash
npm run build
WRANGLER_LOG_PATH=.wrangler/wrangler.log npx wrangler deploy --dry-run
WRANGLER_LOG_PATH=.wrangler/wrangler.log npx wrangler deploy
```

Confirm the deployed Worker URL works after the command succeeds.

### Sites mirror deployment

The Sites mirror is configured through `.openai/hosting.json`. Use the configured Sites publishing workflow rather than inventing another project or editing its project ID. The safe sequence is:

1. Build the project.
2. Push the exact release commit to the Sites source repository with a short-lived Sites source credential.
3. Package the source and build output using the Sites `package-site.sh` helper.
4. Save a version for the exact Git commit.
5. Deploy that saved version and wait for success.

Do not expose, commit, or persist the short-lived Sites credential.

## 8. Known current state and product decisions

- The production Worker and Sites mirror were both updated at commit `e7936ac`.
- The primary user-facing Team path is now discoverable through **For teams** in desktop and mobile navigation.
- `/pricing` links to Custom Incident Studio and candidate screening.
- `/team` links a signed-out visitor to a live Team example.
- The public Studio example remains at `/team/studio/demo`; the Team-aware Studio route is `/team/studio`.
- Pricing plan activation is still a preview mechanism. Payment collection is intentionally not fully wired to Stripe.
- OpenAI improves prose in reports, but scoring remains deterministic even when no API key is set.

## 9. High-value improvements still to make

### Production readiness

1. **Implement real billing.** Replace local preview-plan selection with Stripe Checkout, subscription webhooks, server-side entitlements, upgrades/downgrades, cancellations, invoices, and payment-failure states.
2. **Harden authentication/session storage.** Audit cookie attributes, token lifecycle, account deletion, OAuth error handling, and rate limits. Add a transactional email provider for invitations, trial reminders, and passwordless/account notices if needed.
3. **Add end-to-end monitoring.** Add structured Worker error logs, alerts, uptime checks, Sentry or equivalent, and a production incident runbook.
4. **Automate cleanup.** Schedule the internal cleanup endpoint or use a Cloudflare Cron Trigger so expired workspaces are reliably removed.
5. **Add abuse protections.** Introduce Cloudflare Turnstile and stronger rate limits around uploads, sign-in initiation, public GitHub import, candidate screens, and AI-enhanced reporting.

### Core product quality

6. **Use real sandboxed code execution.** The current score system is deterministic and controlled, but a production version should execute language-specific tests in isolated disposable sandboxes/containers, with CPU, memory, timeout, and network restrictions.
7. **Expand incident generation carefully.** Add more repository analyzers and language-specific failure templates, but always require a known-good baseline, an observable fault, and a reproducible validation contract.
8. **Improve grading explainability.** Surface score deltas, failed assertions, changed files, evidence timeline, and the exact reason for each deduction in the report.
9. **Make the custom incident Studio more guided.** Add diff preview, test preview, validation dry-run, versioning, draft review, duplicate detection, and assignment status.
10. **Finish integrations.** The current PagerDuty, Datadog, and Jira import path normalizes exported JSON. Add authenticated, permission-scoped integrations and clear import/audit history if the product needs direct connections.

### Team and recruiting

11. **Add richer team controls.** Add role-based permissions, seat management, invitation resend/expiry, manager notes, and organization-level audit exports.
12. **Improve recruiting workflows.** Add candidate expiration, consent retention controls, evaluator notes, exportable scorecards, and anti-cheating/identity safeguards appropriate for real hiring.
13. **Build team reports.** Add date ranges, per-skill trends, assignment completion, cohort comparisons, CSV export, and manager-ready summaries.

### UX, accessibility, and reliability

14. **Run a formal accessibility audit.** Test keyboard navigation, focus states, contrast, semantic labels, screen-reader behavior, and mobile layouts across every major journey.
15. **Add browser E2E coverage.** Expand Playwright coverage for sign-in, imports, workspace edits, score submission, daily leaderboard rules, Team assignment, recruiting, and payment-gate behavior.
16. **Simplify duplicate/legacy files.** There are a few historical files with names such as `page 2.tsx` and `Workspace 2.tsx`. Confirm they are unused before removing them, then clean them up in a dedicated, tested change.
17. **Custom domain connected.** `reporehersal.com` is the canonical production hostname; keep OAuth callback allowlists synchronized with it.

## 10. Guardrails for future changes

- Preserve deterministic scoring; never let an LLM silently alter scores, root causes, or validation results.
- Never run arbitrary shell commands from user input.
- Never execute untrusted uploaded code on the Worker itself.
- Treat repository text, issue exports, prompts, and AI output as untrusted data.
- Keep secrets out of commits and logs.
- Validate a clean baseline before injecting an incident.
- Keep desktop and mobile navigation in sync whenever adding a public product surface.
- Deploy only after tests/builds pass, then smoke-test production routes.
