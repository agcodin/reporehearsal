import { env } from "cloudflare:workers";
import type { AuthenticatedUser } from "../auth/auth-service";
import { ensureAccount } from "../accounts/account-service";
import { isBillingCadence, isPlanId, planFor, type BillingCadence, type PlanId } from "./plans";

type StripePlan = Exclude<PlanId, "FREE">;
type SubscriptionStatus = "active" | "trialing" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired" | "paused";
type StripeEnvironment = typeof env & {
  BETA_ALL_PLANS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_WEEKLY?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PRO_ANNUAL?: string;
  STRIPE_PRICE_TEAM_WEEKLY?: string;
  STRIPE_PRICE_TEAM_MONTHLY?: string;
  STRIPE_PRICE_TEAM_ANNUAL?: string;
};

const stripeEnv = env as StripeEnvironment;
const API = "https://api.stripe.com/v1";
const TRIAL_DAYS = 7;

export class BillingError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

type BillingRow = { plan_id: PlanId; status: SubscriptionStatus; cancel_at_period_end: number; current_period_end: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null };

function database(): D1Database {
  if (!env.DB) throw new BillingError("BILLING_UNAVAILABLE", "Billing storage is unavailable.", 503);
  return env.DB;
}

export async function ensureBillingSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS billing_customers (
      account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      stripe_customer_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS billing_subscriptions (
      account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      stripe_customer_id TEXT NOT NULL,
      stripe_subscription_id TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      cadence TEXT NOT NULL,
      status TEXT NOT NULL,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      current_period_end TEXT,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id TEXT PRIMARY KEY NOT NULL,
      received_at TEXT NOT NULL
    )`),
  ]);
}

function secret(name: keyof StripeEnvironment): string {
  const value = stripeEnv[name];
  if (typeof value !== "string" || !value.trim()) throw new BillingError("BILLING_NOT_CONFIGURED", "Payments are not configured yet. Please try again later.", 503);
  return value.trim();
}

function configured(): boolean { return Boolean(stripeEnv.STRIPE_SECRET_KEY?.trim()); }
function betaEnabled(): boolean { return stripeEnv.BETA_ALL_PLANS === "true"; }

function form(fields: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) body.set(key, String(value));
  return body;
}

async function stripe<T>(path: string, fields?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: fields ? "POST" : "GET",
    headers: { Authorization: `Bearer ${secret("STRIPE_SECRET_KEY")}`, ...(fields ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: fields ? form(fields) : undefined,
  });
  const body = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new BillingError("STRIPE_REQUEST_FAILED", body.error?.message ?? "Stripe could not complete that request.", 502);
  return body;
}

function priceKey(plan: StripePlan, cadence: BillingCadence): keyof StripeEnvironment {
  return `STRIPE_PRICE_${plan}_${cadence.toUpperCase()}` as keyof StripeEnvironment;
}

function priceId(plan: StripePlan, cadence: BillingCadence): string {
  const value = stripeEnv[priceKey(plan, cadence)];
  if (typeof value !== "string" || !value.trim()) throw new BillingError("PRICE_NOT_CONFIGURED", `${planFor(plan).name} ${cadence} checkout is not configured yet.`, 503);
  return value.trim();
}

function originFor(request: Request) {
  const origin = new URL(request.url).origin;
  if (origin !== "https://reporehearsal.com" && origin !== "https://repo-rehearsal.aryangaur926.workers.dev" && !origin.startsWith("http://localhost:")) throw new BillingError("INVALID_ORIGIN", "Checkout must be started from RepoRehearsal.", 400);
  return origin;
}

async function customerFor(account: { id: string; email: string; displayName: string }) {
  const db = database();
  const existing = await db.prepare("SELECT stripe_customer_id FROM billing_customers WHERE account_id = ?").bind(account.id).first<{ stripe_customer_id: string }>();
  if (existing) return existing.stripe_customer_id;
  const customer = await stripe<{ id: string }>("/customers", { email: account.email, name: account.displayName, "metadata[account_id]": account.id });
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO billing_customers (account_id, stripe_customer_id, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(account.id, customer.id, now, now).run();
  return customer.id;
}

export async function billingSummary(user: AuthenticatedUser) {
  const account = await ensureAccount(user.email, user.displayName); await ensureBillingSchema();
  if (betaEnabled()) return { configured: configured(), beta: true, plan: "TEAM" as PlanId, status: "beta", cancelAtPeriodEnd: false, currentPeriodEnd: null, customerId: null, subscriptionId: null };
  const row = await database().prepare("SELECT plan_id, status, cancel_at_period_end, current_period_end, stripe_customer_id, stripe_subscription_id FROM billing_subscriptions WHERE account_id = ?").bind(account.id).first<BillingRow>();
  const paid = row && (row.status === "active" || row.status === "trialing") ? row : null;
  return { configured: configured(), beta: false, plan: paid?.plan_id ?? "FREE" as PlanId, status: paid?.status ?? "free", cancelAtPeriodEnd: Boolean(paid?.cancel_at_period_end), currentPeriodEnd: paid?.current_period_end ?? null, customerId: paid?.stripe_customer_id ?? null, subscriptionId: paid?.stripe_subscription_id ?? null };
}

/** Server-side subscription entitlement. Never trust a client-supplied plan header. */
export async function planForUser(user: AuthenticatedUser): Promise<PlanId> {
  return (await billingSummary(user)).plan;
}

export async function createCheckout(user: AuthenticatedUser, request: Request, input: { plan: PlanId; cadence: BillingCadence }) {
  if (input.plan === "FREE") throw new BillingError("FREE_PLAN", "The Free plan does not need checkout.");
  if (!isPlanId(input.plan) || !isBillingCadence(input.cadence)) throw new BillingError("INVALID_PLAN", "Choose a supported plan and billing cadence.");
  const account = await ensureAccount(user.email, user.displayName); const current = await billingSummary(user);
  if (current.beta) return { beta: true, portal: false, url: `${originFor(request)}/${input.plan === "TEAM" ? "team" : "dashboard"}` };
  if (current.plan !== "FREE") return { portal: true, url: await createPortal(user, request) };
  const customer = await customerFor(account); const origin = originFor(request); const price = priceId(input.plan, input.cadence);
  const session = await stripe<{ id: string; url: string }>("/checkout/sessions", {
    mode: "subscription", customer, client_reference_id: account.id,
    "line_items[0][price]": price, "line_items[0][quantity]": 1,
    allow_promotion_codes: true, "subscription_data[trial_period_days]": TRIAL_DAYS,
    "metadata[account_id]": account.id, "metadata[plan_id]": input.plan, "metadata[cadence]": input.cadence,
    "subscription_data[metadata][account_id]": account.id, "subscription_data[metadata][plan_id]": input.plan, "subscription_data[metadata][cadence]": input.cadence,
    success_url: `${origin}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/onboarding/checkout?plan=${input.plan}&billing=${input.cadence}&checkout=cancelled`,
  });
  return { portal: false, sessionId: session.id, url: session.url };
}

export async function createPortal(user: AuthenticatedUser, request: Request) {
  const account = await ensureAccount(user.email, user.displayName); await ensureBillingSchema();
  const customer = await database().prepare("SELECT stripe_customer_id FROM billing_customers WHERE account_id = ?").bind(account.id).first<{ stripe_customer_id: string }>();
  if (!customer) throw new BillingError("NO_BILLING_CUSTOMER", "No Stripe billing profile exists for this account.", 404);
  const portal = await stripe<{ url: string }>("/billing_portal/sessions", { customer: customer.stripe_customer_id, return_url: `${originFor(request)}/account` });
  return portal.url;
}

export async function scheduleCancellation(user: AuthenticatedUser) {
  const account = await ensureAccount(user.email, user.displayName); await ensureBillingSchema();
  const current = await database().prepare("SELECT stripe_subscription_id FROM billing_subscriptions WHERE account_id = ? AND status IN ('active','trialing')").bind(account.id).first<{ stripe_subscription_id: string }>();
  if (!current) throw new BillingError("NO_ACTIVE_SUBSCRIPTION", "There is no active subscription to cancel.", 404);
  await stripe(`/subscriptions/${current.stripe_subscription_id}`, { cancel_at_period_end: true });
  return { scheduled: true };
}

function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join(""); }

export async function verifyStripeSignature(raw: string, signature: string | null) {
  if (!signature) throw new BillingError("INVALID_WEBHOOK", "Missing Stripe signature.", 400);
  const timestamp = signature.split(",").find(item => item.startsWith("t="))?.slice(2);
  const hashes = signature.split(",").filter(item => item.startsWith("v1=")).map(item => item.slice(3));
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300 || !hashes.length) throw new BillingError("INVALID_WEBHOOK", "Stripe signature is invalid.", 400);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret("STRIPE_WEBHOOK_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  if (!hashes.includes(hex(signed))) throw new BillingError("INVALID_WEBHOOK", "Stripe signature is invalid.", 400);
}

export async function applyStripeEvent(event: { id: string; type: string; data: { object: Record<string, unknown> } }) {
  await ensureBillingSchema(); const db = database(); const seen = await db.prepare("SELECT event_id FROM stripe_webhook_events WHERE event_id = ?").bind(event.id).first();
  if (seen) return;
  const object = event.data.object; const metadata = object.metadata as Record<string, string> | undefined; const accountId = metadata?.account_id;
  if (event.type.startsWith("customer.subscription.")) {
    const plan = metadata?.plan_id; const cadence = metadata?.cadence; const customer = typeof object.customer === "string" ? object.customer : null; const subscription = typeof object.id === "string" ? object.id : null; const status = typeof object.status === "string" ? object.status as SubscriptionStatus : null;
    const item = Array.isArray((object.items as { data?: unknown[] } | undefined)?.data) ? (object.items as { data: Array<Record<string, unknown>> }).data[0] : undefined;
    const periodEnd = typeof object.current_period_end === "number" ? object.current_period_end : item?.current_period_end;
    const end = typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null;
    if (accountId && customer && subscription && status && isPlanId(plan ?? null) && plan !== "FREE" && isBillingCadence(cadence ?? null)) await db.prepare(`INSERT INTO billing_subscriptions (account_id, stripe_customer_id, stripe_subscription_id, plan_id, cadence, status, cancel_at_period_end, current_period_end, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id, stripe_subscription_id=excluded.stripe_subscription_id, plan_id=excluded.plan_id, cadence=excluded.cadence, status=excluded.status, cancel_at_period_end=excluded.cancel_at_period_end, current_period_end=excluded.current_period_end, updated_at=excluded.updated_at`).bind(accountId, customer, subscription, plan, cadence, status, object.cancel_at_period_end === true ? 1 : 0, end, new Date().toISOString()).run();
  }
  await db.prepare("INSERT INTO stripe_webhook_events (event_id, received_at) VALUES (?, ?)").bind(event.id, new Date().toISOString()).run();
}
