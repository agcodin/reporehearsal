# Security model

## Isolation

Every session works on a copied repository with a unique ID and maximum lifetime. Production containers must run without privilege, host mounts, or Docker socket access; outbound networking is denied, and CPU/memory limits are mandatory. The local demo adapter preserves path, command, expiry, event, and validation boundaries without presenting itself as a public arbitrary-code sandbox.

## Authentication and account data

Public product and repository-intake routes do not require an account. Protected pages and account APIs use dispatch-owned Sign in with ChatGPT. Identity is read from trusted forwarded headers on the server; client-supplied email or account IDs are never accepted for authorization. Passwords and provider tokens are not handled by RepoRehearsal. D1 rows are owned through the authenticated email-derived account, and writes use prepared statements. Profiles retain identity, preferences, rehearsal result summaries, and repository analysis metadata only.

## Upload safety

Folder and ZIP uploads are limited to 20 MB expanded, 3,000 files, and 1 MB per analyzed text file. Absolute paths, parent traversal, and null bytes are rejected. Environment files, keys, credential files, generated directories, nested archives, binaries, and unsupported file types are excluded. ZIP data is decoded in memory for deterministic analysis and is never extracted into the worker filesystem, so archive links cannot be followed. Only non-content repository metadata is attached to a signed-in account.

Public GitHub import accepts only canonical `https://github.com/owner/repository` URLs, uses fixed `api.github.com` endpoints derived from validated owner/repository segments, limits size and file count, and rejects private repositories, truncated trees, symlinks, and submodules. Only the tree and root package metadata are retrieved; the importer never writes to GitHub.

## Command execution

The client sends approved command IDs such as `run-tests`, never shell text. The server maps each ID to a fixed argv array, uses timeouts, limits output, records a safe summary, and rejects chaining, package installation, outbound tools, destructive database operations, and unknown commands.

## Secrets and logs

`.env` files are excluded. API keys, connection strings, bearer tokens, and session secrets are redacted. User-visible errors contain a correlation ID instead of internal stack traces. Events store action categories and minimal safe payloads.

## AI prompt injection

Repository text is untrusted quoted data. Prompts explicitly prohibit following repository instructions. Only narrow excerpts and deterministic metadata are provided; hidden test source, host credentials, system prompts, and unrelated repository content are never included. Model responses are schema-validated and advisory.

## Hidden validation

Hidden test source lives outside the exercise workspace. The evaluator combines behavioral tests and static checks for deleted tests, hardcoded sample accounts, blanket catches, fake success responses, removed constraints, and globally disabled validation.

## Lifecycle and rate limits

Preparation, command execution, hints, and submission are rate-limited per user/session. Expired workspaces reject new actions and are deleted by an idempotent cleanup job. Uploaded archives and derived data follow the same expiry policy.

## Threats requiring hardened hosting

Container breakout, kernel vulnerabilities, denial of service, archive bombs, and cross-tenant data access require a dedicated sandbox host with patched runtimes, network policy, quotas, audit logs, and separate storage—not a general web worker.
