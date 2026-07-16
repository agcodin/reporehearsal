# Incident design

The main template, `db-required-field-migration-v1`, begins only after the clean billing fixture passes its tests and health checks. Injection makes partner-import profiles contain a null required value and verifies an account-specific 500 response while legacy billing, login, and the dashboard remain healthy.

High-value evidence unlocks when the developer reproduces the endpoint, reads the correlated error, compares working and failing billing rows, inspects the migration, or runs tests. Hints progress from subsystem direction to repair principle and incur capped score deductions.

Public validation checks the visible failing account. Hidden validation checks legacy accounts, new account creation, clean and legacy migration states, constraint preservation, test preservation, and dangerous shortcuts. Valid repairs may differ in implementation, but must restore behavior and address the underlying data contract.

`container-host-config-v1` injects a localhost database URL into `.env.rehearsal` and validates Compose service resolution, connection shape, secret policy, and isolation shortcuts. `provider-schema-drift-v1` injects an unsafe response normalizer and validates renamed fields, runtime parsing, partial responses, and suppression shortcuts. Each scenario owns separate logs, database/dependency evidence, health state, target file, repair rules, and prevention guidance.

## Repository-generated incidents

`repository-generated-v1` is a session-specific adapter rather than a fixed exercise. It scans the filtered repository source and ranks supported boundaries by confidence: container service hostnames, null-safe string normalization, fetch response status guards, environment fallbacks, then repository test/build scripts. The first supported boundary becomes a serializable blueprint containing the exact target, reversible mutation, known-good source contract, file hashes, test paths, realistic evidence, hints, and root-cause explanation.

Preparation applies the blueprint only to the disposable session workspace. Validation accepts restoration of the original contract or a supported equivalent repair, rejects a remaining injected value and unsafe shortcuts, verifies that original files remain present, and limits changes to twelve files. Passing is intentionally separate from scoring: the score also measures whether the developer inspected evidence before editing, opened the affected file, recorded a supported hypothesis, ran tests/build/health/restart checks, changed regression tests, communicated reasoning, and used hints.
