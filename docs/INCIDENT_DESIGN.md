# Incident design

The main template, `db-required-field-migration-v1`, begins only after the clean billing fixture passes its tests and health checks. Injection makes partner-import profiles contain a null required value and verifies an account-specific 500 response while legacy billing, login, and the dashboard remain healthy.

High-value evidence unlocks when the developer reproduces the endpoint, reads the correlated error, compares working and failing billing rows, inspects the migration, or runs tests. Hints progress from subsystem direction to repair principle and incur capped score deductions.

Public validation checks the visible failing account. Hidden validation checks legacy accounts, new account creation, clean and legacy migration states, constraint preservation, test preservation, and dangerous shortcuts. Valid repairs may differ in implementation, but must restore behavior and address the underlying data contract.

`container-host-config-v1` injects a localhost database URL into `.env.rehearsal` and validates Compose service resolution, connection shape, secret policy, and isolation shortcuts. `provider-schema-drift-v1` injects an unsafe response normalizer and validates renamed fields, runtime parsing, partial responses, and suppression shortcuts. Each scenario owns separate logs, database/dependency evidence, health state, target file, repair rules, and prevention guidance.
