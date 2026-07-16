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
