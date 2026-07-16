# Build log

## Task checklist

- [x] Phase 0 — initialize the application, document architecture, detect environment limits, configure tests and typed modules.
- [x] Phase 1 — add the seeded TypeScript billing demo with healthy and incident states.
- [x] Phase 2 — build landing, dashboard, repository, rehearsal, workspace, and report routes.
- [x] Phase 3 — implement deterministic repository mapping and risk detection fixtures.
- [x] Phase 4 — implement path containment, command allowlisting, redaction, expiry, and local adapter boundaries.
- [x] Phase 5 — add the versioned database migration incident, evidence, hints, injection, and reset semantics.
- [x] Phase 6 — add the investigation workspace with editable code, logs, tests, DB evidence, health, notes, hints, and timeline.
- [x] Phase 7 — add deterministic submission, hidden validation, unsafe-patch detection, and scoring.
- [x] Phase 8 — add versioned AI prompts, validated fallback data, and prompt-injection guidance.
- [x] Phase 9 — add configuration and dependency incident definitions as available scenarios.
- [x] Phase 10 — add responsive styling, empty/error/success states, report export, documentation, and quality gates.
- [x] Stretch 1 — add constrained public GitHub import with deterministic stack and incident compatibility analysis.
- [x] Accounts — replace the seeded persona with authenticated profiles, persistent preferences, and user-owned rehearsal history.
- [x] Stretch 2 — add timed Interview mode with coaching disabled and interviewer-focused reporting.
- [x] Public intake — make accounts optional, add a dedicated account entry page, local folder/ZIP analysis, and account-owned repository metadata.
- [x] Production lifecycle — persist filtered sources and disposable workspaces in R2, authorize sessions in D1, replace browser-local state, add distinct scenarios, live report enhancement, rate limits, deletion, cleanup, migrations, and end-to-end coverage.
- [x] Repository brain — derive faults from imported source boundaries, preserve per-session baselines, validate repaired contracts, and score the complete investigation trail.

## Phase notes

### Phase 0

Selected a modular Next.js architecture with a `SandboxService` boundary. Docker and PostgreSQL are absent, so the build uses the specification-approved local adapter. The generated workspace does not permit creating `.git`, so phase evidence is preserved here; commits are pending filesystem permission.

### Phases 1–5

Built the complete deterministic demo foundation. The clean fixture models valid billing records; injection exposes a secondary creation path that produces a missing `billingRegion`. Repository analysis and incident compatibility are deterministic and require no API key.

### Phases 6–9

Built the interactive incident loop and deterministic evaluator. A repair must normalize legacy records, make new records valid, preserve constraints, and avoid sample-specific or blanket-suppression patterns. AI enhancement is optional and cannot override validation.

### Phase 10

Added full product documentation, security/privacy copy, keyboard-focus styling, responsive layouts, demo scripts, submission material, and automated quality gates.

### Stretch 1 — GitHub import

Added public repository analysis through GitHub's read-only API. Import accepts canonical repository-root URLs only, limits repositories to 20 MB and 3,000 files, rejects private repositories, truncated trees, traversal, symlinks, and submodules, and reads only the repository tree plus `package.json` for deterministic stack detection. The source repository is never written or cloned into the application host.

### Accounts and Interview mode

Replaced the static Maya persona and seeded score history with dispatch-owned ChatGPT sign-in and D1-backed accounts. Profiles store only identity, rehearsal defaults, and result summaries. Dashboard metrics are calculated from user-owned sessions and show a truthful empty state for new accounts. Interview mode adds a real countdown, disables the hint ladder, persists outcomes, and produces an interviewer-focused assessment.

### Public repository intake

Kept the landing page, demo, public GitHub import, local upload, and rehearsal setup public while protecting only account-specific pages and writes. Added a dedicated optional-account entry page. Local folder and ZIP uploads are analyzed without filesystem extraction; path traversal, decompression expansion, file count, individual file size, secrets, keys, binaries, and generated directories are bounded or excluded. Filtered source snapshots are stored in R2 for actual rehearsals; anonymous snapshots expire after 24 hours and signed-in snapshots are reusable. Google and GitHub identity buttons were not fabricated because the current Sites authentication surface exposes ChatGPT sign-in but no external OAuth provider configuration.

### Production lifecycle

Replaced the browser-local rehearsal prototype with authorized D1 session records and per-session R2 working copies. Public GitHub and local imports now store filtered source snapshots so the selected codebase actually drives the rehearsal. Added separate database, configuration, and provider-drift injections and validators; server-backed files, evidence, hypotheses, hints, approved commands, time limits, reports, and immediate workspace disposal; optional OpenAI Responses API structured report enhancement; fixed-window abuse limits; repository deletion; scheduled cleanup; schema migrations; and a complete anonymous API lifecycle test.

### Repository brain

Replaced fixed-filename behavior for imported repositories with a deterministic source-derived incident engine. The analyzer now maps routes, services, Prisma models, environment contracts, health checks, migrations, tests, and ranked incident candidates. A generated rehearsal stores the selected mutation, original target, file hashes, evidence, and hidden behavior contract with the disposable workspace; the immutable repository snapshot remains unchanged. Submission validates repair behavior, original structure, bounded scope, and unsafe shortcuts, then calculates a 100-point process score from hypotheses, evidence order, file investigation, verification commands, test changes, communication, and hints. Added unit coverage for candidate ranking/injection/scoring and an end-to-end anonymous upload → generated incident → repair → report lifecycle.
