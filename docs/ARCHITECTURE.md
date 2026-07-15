# RepoRehearsal architecture

RepoRehearsal is a Next.js App Router application deployed through the Sites-compatible Vinext runtime. Dispatch-owned ChatGPT sign-in identifies users, and D1 stores profiles, preferences, and user-owned rehearsal summaries. The hackathon build uses a deterministic in-process demonstration adapter because Docker and PostgreSQL are unavailable in this environment. The adapter implements the same boundaries as the planned Docker adapter: immutable source, per-session copied workspaces, approved command IDs, path containment, expiration, evidence recording, deterministic fault injection, and hidden validation.

```mermaid
flowchart LR
  UI[Next.js product UI] --> API[Validated route handlers]
  API --> Sessions[Session and evidence services]
  Sessions --> Sandbox[SandboxService interface]
  Sandbox --> Local[Local demo adapter]
  Sandbox -. production .-> Docker[Hardened Docker adapter]
  Sessions --> Validate[Public + hidden validation]
  Validate --> Score[Deterministic scoring]
  Score --> Report[Template report / GPT enhancement]
  Analyzer[Deterministic repository analyzer] --> Sessions
  Auth[ChatGPT sign-in] --> Sessions
  Sessions --> D1[Profiles + rehearsal history]
```

## Trust boundaries

- Repository contents and uploads are untrusted data.
- The original repository is never an execution workspace.
- Browser clients submit command IDs, never shell strings.
- File access is normalized and checked against the session root.
- Hidden test definitions remain outside the copied exercise workspace.
- AI output is advisory and schema-validated; deterministic checks decide pass/fail.

## Current environment limits

- Docker: unavailable.
- PostgreSQL CLI/server: unavailable.
- Active adapter: deterministic local demonstration adapter.
- Persistence: seeded, process-local demo state; the production Prisma schema is included for PostgreSQL deployment.

## Vertical slice

The seeded billing repository is analyzed, copied into a session, faulted with `db-required-field-migration-v1`, investigated through files/logs/database evidence, repaired in the editor, and evaluated by public checks, hidden checks, static policy checks, scoring, and a Markdown after-action report.
