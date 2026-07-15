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

Kept the landing page, demo, public GitHub import, local upload, and rehearsal setup public while protecting only account-specific pages and writes. Added a dedicated optional-account entry page. Local folder and ZIP uploads are analyzed without filesystem extraction; path traversal, decompression expansion, file count, individual file size, secrets, keys, binaries, and generated directories are bounded or excluded. Signed-in users retain repository analysis metadata in D1, while repository contents remain outside the account profile. Google and GitHub identity buttons were not fabricated because the current Sites authentication surface exposes dispatch-owned ChatGPT sign-in but no external OAuth provider configuration.
