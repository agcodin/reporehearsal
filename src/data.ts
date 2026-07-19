import type { IncidentTemplate, RepositoryMap } from "./types";

export const repositoryMap: RepositoryMap = {
  analysisVersion: 1,
  repositoryId: "billing-demo",
  name: "RepoRehearsal Billing Demo",
  language: "TypeScript",
  framework: "Express",
  packageManager: "npm",
  database: "PostgreSQL",
  orm: "Prisma",
  testFramework: "Vitest",
  containerized: true,
  entryPoints: ["src/server.ts", "src/app.ts"],
  services: [{ name: "billing-api", files: ["src/routes/billing.ts", "src/services/billing.ts"], routes: ["GET /api/organizations/:id/billing", "GET /health", "GET /ready"] }],
  databaseModels: [
    { name: "Organization", fields: ["id", "name", "createdAt"] },
    { name: "BillingProfile", fields: ["id", "organizationId", "displayName", "billingRegion"] },
  ],
  migrations: ["202602010900_init", "202606121410_add_billing_region"],
  environmentVariables: [
    { name: "DATABASE_URL", required: true, secret: true },
    { name: "PORT", required: false, secret: false },
  ],
  testFiles: ["tests/billing.test.ts", "tests/health.test.ts"],
  healthChecks: ["GET /health", "GET /ready"],
  riskAreas: [
    { type: "migration", description: "Required billing field introduced across multiple account-creation paths.", relatedFiles: ["prisma/migrations/202606121410_add_billing_region/migration.sql", "src/services/billing.ts"], confidence: 0.96 },
    { type: "configuration", description: "Database host differs between local and container runtime.", relatedFiles: ["docker-compose.yml", ".env.example"], confidence: 0.78 },
  ],
  incidentCandidates: [
    { id: "nullable-value-billing-demo", name: "Nullable record serialization failure", category: "database", targetPath: "src/services/billing.ts", confidence: 0.96, reason: "A required billing field crosses multiple account-creation paths and is normalized during serialization." },
    { id: "container-host-billing-demo", name: "Container service discovery regression", category: "configuration", targetPath: "docker-compose.yml", confidence: 0.78, reason: "The database hostname changes across local and container network boundaries." },
  ],
};

export const incidents: IncidentTemplate[] = [
  {
    id: "db-required-field-migration-v1", version: 1, name: "Required field migration", category: "database", difficulty: "intermediate", available: true,
    summary: "Investigate why only newly created accounts fail after a schema rollout.",
    briefing: {
      title: "New accounts cannot open billing", severity: "SEV-2",
      customerReport: "At 2:14 PM, new customer accounts began receiving HTTP 500 errors when opening the billing page. Existing customer accounts appear unaffected.",
      initialAlert: "billing-api 5xx rate is 18.7% and rising", knownImpact: ["New customer billing pages", "Two onboarding paths"], unaffectedSystems: ["Login", "Main dashboard", "Existing customer billing"],
    },
    intendedRootCause: "The secondary account-creation path did not populate billingRegion after the field became required; the billing serializer assumed it was always present.",
    hints: ["Compare billing records from the working and failing account paths.", "Look for a field that changed in the latest migration and is absent from correlated request logs.", "Trace how the partner-import account path creates BillingProfile records.", "Backfill legacy nulls and ensure every creation path writes a valid region; preserve the schema constraint."],
  },
  {
    id: "container-host-config-v1", version: 1, name: "Container host mismatch", category: "configuration", difficulty: "beginner", available: true,
    summary: "Repair a service that uses localhost from inside its container.",
    briefing: { title: "Billing API cannot reach its database", severity: "SEV-2", customerReport: "Billing requests fail in the sandbox only.", initialAlert: "ECONNREFUSED 127.0.0.1:5432", knownImpact: ["Billing API"], unaffectedSystems: ["Web shell"] },
    intendedRootCause: "DATABASE_URL points to localhost instead of the Compose service name.", hints: ["Inspect service health.", "Compare runtime network boundaries.", "Check DATABASE_URL host selection.", "Use the internal Compose service name."],
  },
  {
    id: "provider-schema-drift-v1", version: 1, name: "Provider schema drift", category: "external_dependency", difficulty: "intermediate", available: true,
    summary: "Safely handle a changed and occasionally partial payment-provider response.",
    briefing: { title: "Payment status sync crashes", severity: "SEV-3", customerReport: "Some subscription refreshes return an error.", initialAlert: "provider payload validation failed", knownImpact: ["Subscription refresh"], unaffectedSystems: ["Account login", "Invoices"] },
    intendedRootCause: "The client assumes a renamed provider response field exists without validation.", hints: ["Inspect the provider boundary.", "Compare payloads.", "Validate external data before use.", "Handle timeout and partial responses explicitly."],
  },
  {
    id: "webhook-replay-idempotency-v1", version: 1, name: "Webhook replay duplicates charges", category: "external_dependency", difficulty: "advanced", available: true,
    summary: "Stop a payment-provider retry from creating a second charge while preserving signature verification.",
    briefing: { title: "Duplicate charges after a webhook retry", severity: "SEV-1", customerReport: "A small group of customers received duplicate charges after the provider retried delayed webhook deliveries.", initialAlert: "charge-created events exceed unique provider event IDs", knownImpact: ["Payment charges", "Customer trust", "Reconciliation queue"], unaffectedSystems: ["Checkout creation", "Account login"] },
    intendedRootCause: "The webhook handler persists every delivery without an idempotency lookup, so a valid retry is treated as a new charge.", hints: ["Compare provider event IDs for duplicate charges.", "Find where a webhook delivery becomes a persisted charge.", "Use the provider event ID as an idempotency boundary.", "Keep signature verification before any database mutation and safely short-circuit duplicates."],
  },
  {
    id: "race-condition-counter-v1", version: 1, name: "Concurrent counter write", category: "database", difficulty: "advanced", available: true,
    summary: "Repair an intermittent lost update caused by two requests writing the same value.",
    briefing: { title: "Usage totals drift under concurrency", severity: "SEV-2", customerReport: "Usage totals are occasionally one lower than the accepted request count during traffic bursts.", initialAlert: "accepted requests exceed persisted usage increments", knownImpact: ["Usage metering", "Concurrent requests"], unaffectedSystems: ["Single-request traffic", "Read-only endpoints"] },
    intendedRootCause: "The usage counter uses a read-modify-write sequence without an atomic update or transaction, so concurrent requests overwrite one another.", hints: ["Compare accepted request IDs with stored increments.", "Look for a read followed by a write.", "Consider what two requests read at the same time.", "Replace the sequence with an atomic database increment or locked transaction."],
  },
  {
    id: "n-plus-one-orders-v1", version: 1, name: "N+1 order lookup", category: "database", difficulty: "intermediate", available: true,
    summary: "Remove a query-per-row performance regression without changing the response contract.",
    briefing: { title: "Orders endpoint times out under load", severity: "SEV-2", customerReport: "The orders page works for small accounts but times out for large customers.", initialAlert: "orders endpoint p95 latency crossed 8 seconds", knownImpact: ["Large customer order lists", "Database connection pool"], unaffectedSystems: ["Single-order lookup", "Checkout writes"] },
    intendedRootCause: "The endpoint loads customers inside the orders loop, turning one request into one query per order.", hints: ["Compare latency with the number of returned rows.", "Count database calls in the request trace.", "Inspect relation loading inside loops.", "Fetch the relation in one bounded query while preserving the response shape."],
  },
  {
    id: "retry-storm-v1", version: 1, name: "Cascading retry storm", category: "external_dependency", difficulty: "advanced", available: true,
    summary: "Bound retries and add backoff so a partial dependency outage does not become a full outage.",
    briefing: { title: "Catalog retries overwhelm inventory", severity: "SEV-1", customerReport: "A partial inventory slowdown now causes catalog requests to fail across every region.", initialAlert: "inventory request volume is 9x baseline during elevated latency", knownImpact: ["Catalog availability", "Inventory dependency"], unaffectedSystems: ["Cached product pages", "Checkout payments"] },
    intendedRootCause: "The retry helper immediately recurses without an attempt limit, delay, or circuit boundary.", hints: ["Compare customer traffic with dependency request volume.", "Inspect the retry termination condition.", "Look for delay or jitter between attempts.", "Add a bounded attempt count and exponential backoff; preserve the original error."],
  },
  {
    id: "cache-invalidation-v1", version: 1, name: "Stale cache after write", category: "configuration", difficulty: "intermediate", available: true,
    summary: "Invalidate the exact cached record after a successful update.",
    briefing: { title: "Profile changes appear to be lost", severity: "SEV-3", customerReport: "Customers save a new display name but continue seeing the old value for several minutes.", initialAlert: "profile write succeeds while subsequent reads return stale cache entries", knownImpact: ["Profile reads after update"], unaffectedSystems: ["Profile writes", "Uncached accounts"] },
    intendedRootCause: "The update path writes the database but leaves the profile cache key populated with stale data.", hints: ["Compare the write response with the next read source.", "Inspect the cache key used by profile reads.", "Find the successful database mutation boundary.", "Invalidate the same key only after the write succeeds."],
  },
  {
    id: "auth-role-regression-v1", version: 1, name: "Inverted role authorization", category: "configuration", difficulty: "advanced", available: true,
    summary: "Restore a role boundary that grants admin access to the wrong users.",
    briefing: { title: "Non-admin users can open audit exports", severity: "SEV-1", customerReport: "A support account was able to open an admin-only audit export.", initialAlert: "admin route accessed by role=support", knownImpact: ["Audit export confidentiality", "Role-based access"], unaffectedSystems: ["Authentication", "Public reports"] },
    intendedRootCause: "The authorization predicate is inverted, calling the protected handler when the current role is not admin.", hints: ["Compare the authenticated role with the authorization decision.", "Inspect middleware ordering and predicate direction.", "Check both allowed and denied cases.", "Use an explicit allow condition and fail closed for every other role."],
  },
  {
    id: "swallowed-exception-v1", version: 1, name: "Swallowed job failure", category: "external_dependency", difficulty: "advanced", available: true,
    summary: "Make a silent background-job failure observable and retryable.",
    briefing: { title: "Invoices silently stop exporting", severity: "SEV-2", customerReport: "Invoices show as queued but never arrive in the accounting system, and no alert fired.", initialAlert: "export completion rate fell while worker error rate remains zero", knownImpact: ["Invoice exports", "Queue completion accuracy"], unaffectedSystems: ["Invoice creation", "Accounting reads"] },
    intendedRootCause: "The worker catches exporter failures without logging, rethrowing, or marking the job failed, so the queue acknowledges lost work.", hints: ["Compare queued jobs with downstream deliveries.", "Inspect exception handling around the exporter.", "Check what tells the queue a job failed.", "Record structured context and rethrow or explicitly reject so retry policy can run."],
  },
];

export const injectedBillingSource = `export function serializeBilling(profile: BillingProfile) {
  return {
    displayName: profile.displayName,
    // Incident: partner-import records can still contain null.
    billingRegion: profile.billingRegion.toUpperCase(),
  };
}

export async function createPartnerProfile(input: PartnerAccount) {
  return prisma.billingProfile.create({
    data: { organizationId: input.organizationId, displayName: input.company },
  });
}`;

export const safeBillingSource = `export function serializeBilling(profile: BillingProfile) {
  return {
    displayName: profile.displayName,
    billingRegion: (profile.billingRegion ?? "US").toUpperCase(),
  };
}

export async function createPartnerProfile(input: PartnerAccount) {
  return prisma.billingProfile.create({
    data: {
      organizationId: input.organizationId,
      displayName: input.company,
      billingRegion: input.billingRegion ?? "US",
    },
  });
}

// Migration follow-up: UPDATE billing_profiles SET billing_region = 'US' WHERE billing_region IS NULL;
// Regression coverage: partner-import profiles always serialize with a valid billing region.`;
