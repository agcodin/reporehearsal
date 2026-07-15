# Devpost project description

## Inspiration

Developers have many tools for learning how to write code, but very little safe practice for production debugging. Too often, the first realistic rehearsal is a real outage.

## What it does

RepoRehearsal creates a controlled broken copy of a software project and guides the developer through a realistic incident using code, logs, tests, database evidence, and service health—then validates the repair and creates an after-action report.

## How it works

The product deterministically maps the repository, selects a compatible approved incident, verifies a clean baseline, injects a fault into an isolated workspace, unlocks evidence through investigation actions, and runs public tests, hidden tests, static safety checks, scoring, and report generation on submission.

## How Codex was used

Codex helped shape the modular architecture, build the responsive product, create the demo repository and Prisma schemas, implement security boundaries and incident templates, generate tests, debug builds, and produce the security, demo, and submission documentation.

## How GPT-5.6 was used

GPT-5.6 can enhance architecture summaries, choose coaching language, assess the recorded reasoning path, and improve after-action reports. Structured schemas and deterministic validation prevent it from overriding pass/fail decisions. A full fallback works without an API key.

## Challenges

The hardest problems were creating deterministic incidents, protecting the source repository, keeping hidden tests meaningful, rejecting symptom-only patches, and balancing helpful coaching with developer independence.

## Accomplishments

We built the full incident loop: repository map, healthy baseline, controlled failure, realistic evidence, editable workspace, hidden validation, unsafe-fix rejection, scoring, prevention guidance, and Markdown export.

## What we learned

Generating code and training incident reasoning are different product problems. A useful rehearsal must preserve uncertainty, reward evidence, accept multiple safe repairs, and validate behavior independently of the model.

## What is next

More language adapters, organization-specific exercises, GitHub import, team incident rooms, Kubernetes scenarios, runbook validation, onboarding tracks, interview mode, and progress analytics.
