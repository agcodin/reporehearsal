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

## Phase notes

### Phase 0

Selected a modular Next.js architecture with a `SandboxService` boundary. Docker and PostgreSQL are absent, so the build uses the specification-approved local adapter. The generated workspace does not permit creating `.git`, so phase evidence is preserved here; commits are pending filesystem permission.

### Phases 1–5

Built the complete deterministic demo foundation. The clean fixture models valid billing records; injection exposes a secondary creation path that produces a missing `billingRegion`. Repository analysis and incident compatibility are deterministic and require no API key.

### Phases 6–9

Built the interactive incident loop and deterministic evaluator. A repair must normalize legacy records, make new records valid, preserve constraints, and avoid sample-specific or blanket-suppression patterns. AI enhancement is optional and cannot override validation.

### Phase 10

Added full product documentation, security/privacy copy, keyboard-focus styling, responsive layouts, demo scripts, submission material, and automated quality gates.
