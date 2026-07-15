# Security model

## Isolation and authorization

Every imported repository is an immutable, filtered R2 snapshot. Every rehearsal receives a new working-copy object and a unique 32-byte access token. Only a matching token hash or the owning ChatGPT account can access it. Active sessions expire at the selected time limit; completed and expired working copies are deleted.

The Sites worker uses a curated virtual command adapter: approved command IDs produce deterministic scenario checks and evidence. It never executes uploaded shell code, installs dependencies, follows repository instructions, or exposes a Docker socket. Arbitrary execution belongs on a separately patched and quota-controlled sandbox host.

## Authentication and account data

Public product, intake, and rehearsal routes do not require an account. ChatGPT identity is read from trusted hosting headers; client-supplied email/account IDs are never authorization inputs. Account-owned snapshots persist for reuse. Anonymous snapshots expire after 24 hours. The repository DELETE API removes the R2 object and matching metadata.

Google and GitHub OAuth buttons are not fabricated because Sites currently supplies only ChatGPT sign-in. Public GitHub imports are authorized by repository URL plus the returned opaque session token.

## Upload and GitHub safety

Folder and ZIP uploads are limited to 20 MB expanded, 3,000 files, and 1 MB per analyzed text file. Absolute paths, traversal, null bytes, symlinks, nested archives, generated directories, environment files, keys, credentials, binaries, and unsupported types are rejected or excluded.

GitHub import accepts canonical `https://github.com/owner/repository` roots, validates public metadata, and downloads a bounded archive only from a derived `codeload.github.com` URL. Private repositories, truncated trees, symlinks, submodules, excessive files, and oversized payloads fail closed. Source repositories are never written.

## Commands, AI, and hidden validation

The browser sends fixed command IDs; unknown IDs receive 403. File paths are normalized and content updates are bounded. Repository text is never included in the report-enhancement prompt. The OpenAI request contains deterministic check summaries, the intended root cause, safe event summaries, and user hypotheses. Structured output is schema-validated and cannot change score, outcome, checks, or root cause.

Hidden checks cover the secondary behavior, legacy state, unsafe shortcuts, and category-specific invariants. Their source remains server-side.

## Abuse prevention and lifecycle

Rehearsal requests are limited to 120 per minute per Cloudflare client fingerprint. GitHub imports and uploads are limited to 10 per hour. Expired resources are deleted opportunistically and through `POST /api/internal/cleanup`, protected by `CLEANUP_SECRET`. Cleanup is bounded to 100 items per resource type per call and is safe to schedule repeatedly.

## Residual risks

The worker does not eliminate risks in a future arbitrary-code executor. Container breakout, kernel vulnerabilities, resource exhaustion, dependency attacks, and cross-tenant leakage require a dedicated sandbox plane with network denial, resource quotas, short-lived credentials, audit logs, and rapid patching.
