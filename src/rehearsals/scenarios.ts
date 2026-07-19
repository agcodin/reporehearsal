import { incidents, injectedBillingSource } from "../data";
import { hintPenalty } from "../evaluation/scoring";
import type { IncidentTemplate, ValidationResult } from "../types";
import type { WorkspaceFile } from "./types";

export type Scenario = {
  template: IncidentTemplate; targetPath: string; injectedSource: string; logs: string[]; databaseEvidence: string[]; healthEvidence: string[];
  prepare(files: WorkspaceFile[]): WorkspaceFile[]; evaluate(files: WorkspaceFile[], hintCount: number): ValidationResult;
};

function overlay(files: WorkspaceFile[], path: string, content: string): WorkspaceFile[] { const next=files.filter(file=>file.path!==path).map(file=>({...file}));next.push({path,content});return next.sort((a,b)=>a.path.localeCompare(b.path)); }
function result(checks: ValidationResult["checks"], hintCount: number, untouched = false, regressed = false): ValidationResult { const passed=checks.every(check=>check.status==="passed");const penalty=hintCount?hintPenalty(Array.from({length:hintCount},(_,index)=>index+1)):0;const breakdown=untouched?[{label:"Diagnosis",earned:0,possible:25},{label:"Investigation",earned:0,possible:20},{label:"Fix quality",earned:0,possible:25},{label:"Verification",earned:0,possible:15},{label:"Prevention",earned:0,possible:10},{label:"Communication",earned:0,possible:5}]:regressed?[{label:"Diagnosis",earned:0,possible:25},{label:"Investigation",earned:0,possible:20},{label:"Fix quality",earned:-25,possible:25},{label:"Verification",earned:0,possible:15},{label:"Prevention",earned:0,possible:10},{label:"Communication",earned:0,possible:5}]:[{label:"Diagnosis",earned:passed?24:8,possible:25},{label:"Investigation",earned:passed?18:7,possible:20},{label:"Fix quality",earned:passed?25:Math.max(0,checks.filter(check=>check.status==="passed").length*3),possible:25},{label:"Verification",earned:passed?14:4,possible:15},{label:"Prevention",earned:passed?9:2,possible:10},{label:"Communication",earned:passed?5:2,possible:5}];return{passed,score:breakdown.reduce((sum,item)=>sum+item.earned,0)-(untouched||regressed?0:penalty),checks,breakdown}; }
function file(files:WorkspaceFile[],path:string){return files.find(item=>item.path===path)?.content??""}

const databaseTemplate=incidents.find(item=>item.id==="db-required-field-migration-v1")!;
const configurationTemplate=incidents.find(item=>item.id==="container-host-config-v1")!;
const providerTemplate=incidents.find(item=>item.id==="provider-schema-drift-v1")!;
const webhookTemplate=incidents.find(item=>item.id==="webhook-replay-idempotency-v1")!;
const raceTemplate=incidents.find(item=>item.id==="race-condition-counter-v1")!;
const nPlusOneTemplate=incidents.find(item=>item.id==="n-plus-one-orders-v1")!;
const retryTemplate=incidents.find(item=>item.id==="retry-storm-v1")!;
const cacheTemplate=incidents.find(item=>item.id==="cache-invalidation-v1")!;
const authTemplate=incidents.find(item=>item.id==="auth-role-regression-v1")!;
const silentTemplate=incidents.find(item=>item.id==="swallowed-exception-v1")!;

type ContractScenarioInput = {
  template: IncidentTemplate; targetPath: string; injectedSource: string; logs: string[]; databaseEvidence: string[]; healthEvidence: string[];
  checks: { name: string; pattern: RegExp; pass: string; fail: string; hidden?: boolean }[]; unsafe?: RegExp;
};
function contractScenario(input: ContractScenarioInput): Scenario {
  return { template: input.template, targetPath: input.targetPath, injectedSource: input.injectedSource, logs: input.logs, databaseEvidence: input.databaseEvidence, healthEvidence: input.healthEvidence,
    prepare: files => overlay(files, input.targetPath, input.injectedSource),
    evaluate(files, hints) { const source=file(files,input.targetPath);const unsafe=Boolean(input.unsafe?.test(source));const checks=input.checks.map(check=>({name:check.name,status:(check.pattern.test(source)?"passed":"failed") as "passed"|"failed",hidden:check.hidden,detail:check.pattern.test(source)?check.pass:check.fail}));checks.push({name:"Unsafe shortcut scan",status:unsafe?"failed":"passed",hidden:true,detail:unsafe?"The repair bypasses a safety boundary.":"No blanket suppression or unsafe bypass detected."});return result(checks,hints,false,unsafe); },
  };
}

export const scenarios: Record<string,Scenario> = {
  [databaseTemplate.id]: { template:databaseTemplate,targetPath:"src/services/billing.ts",injectedSource:injectedBillingSource,
    logs:["14:14:09 ERROR billing-api request_id=req_8f2a TypeError: Cannot read properties of null (reading 'toUpperCase')","14:14:09 INFO route=/api/organizations/org_new_02/billing status=500 duration_ms=24"],
    databaseEvidence:["org_legacy_01 | US | signup","org_new_01 | NULL | partner_import","org_new_02 | NULL | partner_import"],healthEvidence:["billing-api DEGRADED /ready 503","authentication HEALTHY /health 200","postgres HEALTHY connection 7ms"],
    prepare:files=>overlay(files,"src/services/billing.ts",injectedBillingSource),evaluate(files,hints){const source=file(files,"src/services/billing.ts");const backfill=/UPDATE\s+billing_profiles[\s\S]*WHERE\s+billing_region\s+IS\s+NULL/i.test(source);const creation=/billingRegion:\s*input\.billingRegion\s*\?\?/.test(source);const safe=/profile\.billingRegion\s*\?\?/.test(source);const unsafe=/always return success|drop\s+not\s+null|it\.skip|describe\.skip/i.test(source);return result([{name:"Failing account billing page",status:safe?"passed":"failed",detail:safe?"Legacy records serialize safely.":"The serializer still crashes on a missing region."},{name:"Partner-import creation",status:creation?"passed":"failed",hidden:true,detail:creation?"The secondary path writes a valid region.":"The secondary path can create invalid data."},{name:"Legacy data backfill",status:backfill?"passed":"failed",hidden:true,detail:backfill?"Legacy null rows are backfilled.":"No safe legacy backfill was detected."},{name:"Unsafe shortcut scan",status:unsafe?"failed":"passed",hidden:true,detail:unsafe?"A dangerous shortcut was detected.":"No constraint removal or disabled test detected."}],hints)} },
  [configurationTemplate.id]: { template:configurationTemplate,targetPath:".env.rehearsal",injectedSource:"DATABASE_URL=postgresql://rehearsal:rehearsal@localhost:5432/billing\nPORT=3001",
    logs:["09:42:18 ERROR PrismaClientInitializationError connect ECONNREFUSED 127.0.0.1:5432","09:42:18 INFO runtime=container service=billing-api"],databaseEvidence:["postgres service | accepting connections | port 5432","billing-api container | isolated network | localhost=billing-api"],healthEvidence:["billing-api UNHEALTHY database connection refused","postgres HEALTHY accepting connections"],
    prepare:files=>overlay(files,".env.rehearsal","DATABASE_URL=postgresql://rehearsal:rehearsal@localhost:5432/billing\nPORT=3001"),evaluate(files,hints){const source=file(files,".env.rehearsal");const host=/@(?:postgres|db):5432\//.test(source);const kept=/DATABASE_URL=postgresql:\/\//.test(source);const noSecret=!/password\s*=\s*(?!rehearsal)/i.test(source);const unsafe=/0\.0\.0\.0:5432|--network\s+host|privileged:\s*true/i.test(source);return result([{name:"Container database resolution",status:host?"passed":"failed",detail:host?"The Compose service hostname is used.":"The service still resolves the database through localhost."},{name:"Connection contract",status:kept?"passed":"failed",hidden:true,detail:kept?"The PostgreSQL connection contract is preserved.":"DATABASE_URL was removed or malformed."},{name:"Secret policy",status:noSecret?"passed":"failed",hidden:true,detail:noSecret?"No new credential material was introduced.":"A credential-like value was added."},{name:"Unsafe networking scan",status:unsafe?"failed":"passed",hidden:true,detail:unsafe?"Host networking or privileged access was introduced.":"Container isolation remains intact."}],hints)} },
  [providerTemplate.id]: { template:providerTemplate,targetPath:"src/services/provider-client.ts",injectedSource:`type ProviderPayload = { status?: string; subscription_status?: string };
export function normalizeProvider(payload: ProviderPayload) {
  return { status: payload.status!.toUpperCase() };
}`,
    logs:["16:08:31 ERROR provider-sync TypeError: Cannot read properties of undefined (reading 'toUpperCase')","16:08:31 WARN provider payload field status renamed to subscription_status"],databaseEvidence:["sub_legacy | active | last_sync 15:55","sub_affected | stale | last_sync 16:08"],healthEvidence:["provider-sync DEGRADED partial payload failures","billing-api HEALTHY","provider endpoint HEALTHY p95=420ms"],
    prepare:files=>overlay(files,"src/services/provider-client.ts",`type ProviderPayload = { status?: string; subscription_status?: string };
export function normalizeProvider(payload: ProviderPayload) {
  return { status: payload.status!.toUpperCase() };
}`),evaluate(files,hints){const source=file(files,"src/services/provider-client.ts");const renamed=/subscription_status/.test(source)&&/(?:\?\?|\|\|)/.test(source);const validation=/safeParse|typeof\s+.*===\s*["']string["']|z\.object/.test(source);const partial=/unknown|optional|undefined|missing|fallback/i.test(source);const unsafe=/as\s+any|@ts-ignore|always return success/i.test(source);return result([{name:"Renamed provider field",status:renamed?"passed":"failed",detail:renamed?"Both provider field versions are handled.":"The renamed field is still ignored."},{name:"Runtime payload validation",status:validation?"passed":"failed",hidden:true,detail:validation?"Untrusted provider data is validated.":"The provider payload is still trusted without validation."},{name:"Partial response handling",status:partial?"passed":"failed",hidden:true,detail:partial?"Missing values have an explicit safe path.":"Partial responses remain crash-prone."},{name:"Unsafe suppression scan",status:unsafe?"failed":"passed",hidden:true,detail:unsafe?"A type-safety suppression or blanket success was detected.":"No blanket suppression detected."}],hints)} },
  [webhookTemplate.id]: { template:webhookTemplate,targetPath:"src/services/webhook-handler.ts",injectedSource:`export async function handleWebhook(event: ProviderEvent, signature: string) {
  verifyWebhook(signature, event);
  return prisma.charge.create({
    data: { providerEventId: event.id, amount: event.amount, customerId: event.customerId },
  });
}`,
    logs:["18:22:04 WARN payment-webhook delivery replay event_id=evt_94f2 attempt=2","18:22:04 ERROR reconciliation duplicate provider_event_id=evt_94f2 charges=ch_801,ch_802"],databaseEvidence:["evt_94f2 | ch_801 | 4200 | delivered 18:20","evt_94f2 | ch_802 | 4200 | replayed 18:22","evt_95a1 | ch_803 | 1900 | delivered 18:23"],healthEvidence:["payment-webhook DEGRADED duplicate-event rate 3.8%","checkout HEALTHY","provider signature verification HEALTHY"],
    prepare:files=>overlay(files,"src/services/webhook-handler.ts",`export async function handleWebhook(event: ProviderEvent, signature: string) {
  verifyWebhook(signature, event);
  return prisma.charge.create({
    data: { providerEventId: event.id, amount: event.amount, customerId: event.customerId },
  });
}`),evaluate(files,hints){const source=file(files,"src/services/webhook-handler.ts");const lookup=/findUnique|upsert|findFirst/.test(source)&&/providerEventId/.test(source);const shortCircuit=/if\s*\([^)]*(?:existing|duplicate|charge)[^)]*\)\s*(?:\{|return)/i.test(source);const verification=/verifyWebhook|verifySignature|signature/i.test(source);const unsafe=/always return success|@ts-ignore|catch\s*\([^)]*\)\s*\{\s*\}/i.test(source);return result([{name:"Replay idempotency boundary",status:lookup?"passed":"failed",detail:lookup?"A provider event ID is checked before another charge is created.":"The handler still creates a charge for every delivery."},{name:"Duplicate delivery short-circuit",status:shortCircuit?"passed":"failed",hidden:true,detail:shortCircuit?"Known deliveries exit without another mutation.":"A duplicate delivery can still create a second charge."},{name:"Signature verification",status:verification?"passed":"failed",hidden:true,detail:verification?"Verification remains before persistence.":"The provider signature boundary was removed."},{name:"Unsafe shortcut scan",status:unsafe?"failed":"passed",hidden:true,detail:unsafe?"A blanket suppression was detected.":"No blanket suppression detected."}],hints)} },
  [raceTemplate.id]: contractScenario({ template:raceTemplate,targetPath:"src/services/usage-counter.ts",injectedSource:`export async function incrementUsage(accountId: string) {
  const current = await db.usage.findUnique({ where: { accountId } });
  return db.usage.update({ where: { accountId }, data: { count: current.count + 1 } });
}`,
    logs:["WARN usage accepted=482 persisted_increments=477 window=60s","INFO mismatch appears only when requests overlap"],databaseEvidence:["account_42 | accepted 482 | stored 477","single-request replay | accepted 10 | stored 10"],healthEvidence:["usage-api HEALTHY","database HEALTHY contention low"],
    checks:[{name:"Atomic counter mutation",pattern:/(?:increment\s*:|transaction|SELECT[\s\S]*FOR\s+UPDATE|atomic)/i,pass:"The counter update is atomic or protected by a transaction.",fail:"The counter still uses an unprotected read-modify-write sequence."},{name:"Account-scoped update",pattern:/where\s*:\s*\{\s*accountId/i,pass:"The mutation remains scoped to the affected account.",fail:"The account boundary was removed.",hidden:true},{name:"Increment preserved",pattern:/(?:increment\s*:\s*1|count\s*\+\s*1)/i,pass:"Each accepted request adds exactly one.",fail:"The repair no longer preserves increment semantics.",hidden:true}],unsafe:/setTimeout|always return success|@ts-ignore/i }),
  [nPlusOneTemplate.id]: contractScenario({ template:nPlusOneTemplate,targetPath:"src/services/orders.ts",injectedSource:`export async function listOrders() {
  const orders = await db.order.findMany();
  return Promise.all(orders.map(async order => ({ ...order, customer: await db.customer.findUnique({ where: { id: order.customerId } }) })));
}`,
    logs:["WARN route=/orders queries=251 rows=250 duration_ms=8230","INFO route=/orders queries grow linearly with result count"],databaseEvidence:["small account | 6 queries | 85ms","large account | 251 queries | 8230ms"],healthEvidence:["orders-api DEGRADED p95=8.2s","database SATURATED pool_wait=4.1s"],
    checks:[{name:"Bounded relation loading",pattern:/(?:include\s*:\s*\{[^}]*customer|\bjoin\b|customerId\s*:\s*\{\s*in\s*:)/i,pass:"Customer data is fetched in a bounded query plan.",fail:"The request still loads one customer per order."},{name:"Response relation preserved",pattern:/customer/i,pass:"The response still includes customer data.",fail:"The repair removed required customer data.",hidden:true},{name:"Order query preserved",pattern:/order\.findMany/i,pass:"The orders query remains intact.",fail:"The endpoint no longer loads orders.",hidden:true}],unsafe:/slice\(0,\s*1\)|always return \[\]|@ts-ignore/i }),
  [retryTemplate.id]: contractScenario({ template:retryTemplate,targetPath:"src/services/retry.ts",injectedSource:`export async function loadInventory(request: Request): Promise<Item[]> {
  try { return await inventory.fetch(request); }
  catch { return loadInventory(request); }
}`,
    logs:["ERROR inventory upstream latency=2400ms requests_per_customer=9","WARN retry traffic exceeds original traffic by 8x"],databaseEvidence:["attempt 1 | timeout","attempt 2..9 | immediate retry","circuit state | absent"],healthEvidence:["catalog UNHEALTHY retry saturation","inventory DEGRADED elevated latency"],
    checks:[{name:"Bounded attempts",pattern:/(?:maxAttempts|maxRetries|attempt\s*[<>=]|attempts?\s*[<>=])/i,pass:"Retries stop after a bounded number of attempts.",fail:"The retry path still has no attempt limit."},{name:"Backoff or delay",pattern:/(?:backoff|setTimeout|sleep|delay|jitter)/i,pass:"Retries are delayed instead of firing immediately.",fail:"Retries still fire without backoff.",hidden:true},{name:"Failure propagation",pattern:/(?:throw|Promise\.reject|return\s+result)/i,pass:"Terminal failure remains visible to the caller.",fail:"The terminal dependency failure is swallowed.",hidden:true}],unsafe:/while\s*\(true\)|catch\s*\{\s*return\s*\[\]/i }),
  [cacheTemplate.id]: contractScenario({ template:cacheTemplate,targetPath:"src/services/profile.ts",injectedSource:`export async function updateProfile(id: string, input: ProfileInput) {
  const profile = await db.profile.update({ where: { id }, data: input });
  return profile;
}`,
    logs:["INFO profile update status=200 id=acct_18","WARN next profile read source=cache age=287s"],databaseEvidence:["database display_name | Maya Chen","cache profile:acct_18 | Maya C."],healthEvidence:["profile writes HEALTHY","profile reads DEGRADED stale-hit rate=12%"],
    checks:[{name:"Exact cache invalidation",pattern:/(?:cache|redis)\.(?:delete|del|invalidate)\([^)]*(?:id|profile)/i,pass:"The affected profile cache key is invalidated.",fail:"The stale profile cache remains populated after the write."},{name:"Write completes before invalidation",pattern:/await\s+db\.profile\.update/i,pass:"The database write completes before cache invalidation.",fail:"The update no longer waits for persistence.",hidden:true},{name:"Updated profile returned",pattern:/return\s+profile/i,pass:"The endpoint preserves its response contract.",fail:"The updated profile is no longer returned.",hidden:true}],unsafe:/flushAll|clear\(\)|always return success/i }),
  [authTemplate.id]: contractScenario({ template:authTemplate,targetPath:"src/middleware/admin.ts",injectedSource:`export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== "admin") return next();
  return res.status(403).json({ error: "forbidden" });
}`,
    logs:["ERROR audit-export access role=support decision=allowed","INFO authentication subject verified"],databaseEvidence:["role=admin | expected allow","role=support | expected deny | observed allow"],healthEvidence:["authentication HEALTHY","authorization DEGRADED protected-route violation"],
    checks:[{name:"Explicit admin allow",pattern:/role\s*={2,3}\s*["']admin["'][\s\S]{0,80}(?:next\(|return\s+next)/i,pass:"Only the admin role reaches the protected handler.",fail:"The authorization condition still allows a non-admin role."},{name:"Fail-closed response",pattern:/(?:403|forbidden|deny)/i,pass:"Non-admin requests fail closed.",fail:"The denied response was removed.",hidden:true},{name:"Authenticated role checked",pattern:/req\.user\.role/i,pass:"The decision uses the authenticated role.",fail:"The authenticated role is no longer checked.",hidden:true}],unsafe:/always return success|@ts-ignore/i }),
  [silentTemplate.id]: contractScenario({ template:silentTemplate,targetPath:"src/workers/export-invoice.ts",injectedSource:`export async function exportInvoice(job: InvoiceJob) {
  try { await accounting.send(job.invoice); }
  catch (error) { }
}`,
    logs:["WARN invoice jobs acknowledged=140 downstream_deliveries=131","INFO worker reported errors=0"],databaseEvidence:["invoice_92 | queued | downstream missing","invoice_93 | completed | downstream present"],healthEvidence:["invoice-worker HEALTHY reported","accounting DEGRADED intermittent 503"],
    checks:[{name:"Failure is observable",pattern:/(?:logger|console)\.(?:error|warn)|recordFailure|markFailed/i,pass:"Exporter failures are recorded with an observable signal.",fail:"The exporter failure remains invisible."},{name:"Queue retry is preserved",pattern:/(?:throw\s+error|Promise\.reject|job\.retry|reject\()/i,pass:"The failed job remains eligible for retry.",fail:"The queue can still acknowledge lost work.",hidden:true},{name:"Exporter call preserved",pattern:/accounting\.send/i,pass:"The real export boundary remains in place.",fail:"The repair removed the export operation.",hidden:true}],unsafe:/catch\s*\([^)]*\)\s*\{\s*\}|always return success|return\s+true/i }),
};

export function scenarioFor(id:string):Scenario{const scenario=scenarios[id];if(!scenario)throw new Error("Incident template not found");return scenario}
