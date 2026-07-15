# Security model

## Isolation

Every session works on a copied repository with a unique ID and maximum lifetime. Production containers must run without privilege, host mounts, or Docker socket access; outbound networking is denied, and CPU/memory limits are mandatory. The local demo adapter preserves path, command, expiry, event, and validation boundaries without presenting itself as a public arbitrary-code sandbox.

## Upload safety

Archive entries are rejected when they contain absolute paths, parent traversal, null bytes, symlinks, nested archives, unsupported binaries, excessive file counts, or excessive expanded size. Extraction must create files only beneath a newly allocated workspace and must not follow links.

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
