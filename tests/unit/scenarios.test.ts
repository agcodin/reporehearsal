import { describe, expect, it } from "vitest";
import { incidents, safeBillingSource } from "../../src/data";
import { scenarioFor } from "../../src/rehearsals/scenarios";
import type { WorkspaceFile } from "../../src/rehearsals/types";

function evaluate(id: string, path: string, content: string) {
  const scenario = scenarioFor(id);
  return scenario.evaluate([{ path, content } satisfies WorkspaceFile], 0);
}

describe("production incident scenarios", () => {
  it("backs every advertised incident with an injectable deterministic scenario", () => {
    expect(incidents).toHaveLength(10);
    for (const incident of incidents) {
      const scenario = scenarioFor(incident.id);
      const prepared = scenario.prepare([{ path: "README.md", content: "clean baseline" }]);
      expect(scenario.template.id).toBe(incident.id);
      expect(prepared.find(file => file.path === scenario.targetPath)?.content).toBe(scenario.injectedSource);
      expect(scenario.evaluate(prepared, 0).passed).toBe(false);
    }
  });
  it("injects a distinct fault into a copied workspace", () => {
    const source = [{ path: "README.md", content: "source snapshot" }];
    const prepared = scenarioFor("container-host-config-v1").prepare(source);
    expect(prepared).not.toBe(source);
    expect(source).toEqual([{ path: "README.md", content: "source snapshot" }]);
    expect(prepared.some(file => file.path === ".env.rehearsal")).toBe(true);
  });

  it("passes and fails the database migration scenario deterministically", () => {
    expect(evaluate("db-required-field-migration-v1", "src/services/billing.ts", safeBillingSource).passed).toBe(true);
    expect(evaluate("db-required-field-migration-v1", "src/services/billing.ts", "profile.billingRegion.toUpperCase()").passed).toBe(false);
  });

  it("passes and fails the container networking scenario deterministically", () => {
    expect(evaluate("container-host-config-v1", ".env.rehearsal", "DATABASE_URL=postgresql://rehearsal:rehearsal@postgres:5432/billing").passed).toBe(true);
    expect(evaluate("container-host-config-v1", ".env.rehearsal", "DATABASE_URL=postgresql://rehearsal:rehearsal@localhost:5432/billing").passed).toBe(false);
  });

  it("passes and fails the provider schema-drift scenario deterministically", () => {
    const safe = `import { z } from "zod";
export function normalizeProvider(payload: unknown) {
  const parsed = z.object({ status: z.string().optional(), subscription_status: z.string().optional() }).safeParse(payload);
  if (!parsed.success) return { status: "UNKNOWN" };
  const status = parsed.data.status ?? parsed.data.subscription_status ?? "unknown";
  return { status: status.toUpperCase() };
}`;
    expect(evaluate("provider-schema-drift-v1", "src/services/provider-client.ts", safe).passed).toBe(true);
    expect(evaluate("provider-schema-drift-v1", "src/services/provider-client.ts", "return payload.status.toUpperCase()").passed).toBe(false);
  });

  it("passes and fails the webhook replay scenario deterministically", () => {
    const safe = `export async function handleWebhook(event: ProviderEvent, signature: string) {
  verifyWebhook(signature, event);
  const existing = await prisma.charge.findUnique({ where: { providerEventId: event.id } });
  if (existing) return existing;
  return prisma.charge.create({ data: { providerEventId: event.id, amount: event.amount } });
}`;
    expect(evaluate("webhook-replay-idempotency-v1", "src/services/webhook-handler.ts", safe).passed).toBe(true);
    expect(evaluate("webhook-replay-idempotency-v1", "src/services/webhook-handler.ts", "return prisma.charge.create({ data: { providerEventId: event.id } })").passed).toBe(false);
  });

  it("applies coaching penalties without changing the repair outcome", () => {
    const scenario = scenarioFor("db-required-field-migration-v1");
    const files = [{ path: scenario.targetPath, content: safeBillingSource }];
    expect(scenario.evaluate(files, 4).passed).toBe(true);
    expect(scenario.evaluate(files, 4).score).toBeLessThan(scenario.evaluate(files, 0).score);
  });
});
