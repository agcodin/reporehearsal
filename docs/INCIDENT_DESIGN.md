# Incident design

The main template, `db-required-field-migration-v1`, begins only after the clean billing fixture passes its tests and health checks. Injection makes partner-import profiles contain a null required value and verifies an account-specific 500 response while legacy billing, login, and the dashboard remain healthy.

High-value evidence unlocks when the developer reproduces the endpoint, reads the correlated error, compares working and failing billing rows, inspects the migration, or runs tests. Hints progress from subsystem direction to repair principle and incur capped score deductions.

Public validation checks the visible failing account. Hidden validation checks legacy accounts, new account creation, clean and legacy migration states, constraint preservation, test preservation, and dangerous shortcuts. Valid repairs may differ in implementation, but must restore behavior and address the underlying data contract.

The configuration and dependency templates follow the same schema and lifecycle. Their mutations are deterministic and offline-safe.
