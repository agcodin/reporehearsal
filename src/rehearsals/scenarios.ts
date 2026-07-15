import { incidents, injectedBillingSource } from "../data";
import { hintPenalty } from "../evaluation/scoring";
import type { IncidentTemplate, ValidationResult } from "../types";
import type { WorkspaceFile } from "./types";

export type Scenario = {
  template: IncidentTemplate; targetPath: string; injectedSource: string; logs: string[]; databaseEvidence: string[]; healthEvidence: string[];
  prepare(files: WorkspaceFile[]): WorkspaceFile[]; evaluate(files: WorkspaceFile[], hintCount: number): ValidationResult;
};

function overlay(files: WorkspaceFile[], path: string, content: string): WorkspaceFile[] { const next=files.filter(file=>file.path!==path).map(file=>({...file}));next.push({path,content});return next.sort((a,b)=>a.path.localeCompare(b.path)); }
function result(checks: ValidationResult["checks"], hintCount: number): ValidationResult { const passed=checks.every(check=>check.status==="passed");const penalty=hintCount?hintPenalty(Array.from({length:hintCount},(_,index)=>index+1)):0;const breakdown=[{label:"Diagnosis",earned:passed?24:12,possible:25},{label:"Investigation",earned:passed?18:10,possible:20},{label:"Fix quality",earned:passed?25:8,possible:25},{label:"Verification",earned:passed?14:6,possible:15},{label:"Prevention",earned:passed?9:4,possible:10},{label:"Communication",earned:5,possible:5}];return{passed,score:Math.max(0,breakdown.reduce((sum,item)=>sum+item.earned,0)-penalty),checks,breakdown}; }
function file(files:WorkspaceFile[],path:string){return files.find(item=>item.path===path)?.content??""}

const databaseTemplate=incidents.find(item=>item.id==="db-required-field-migration-v1")!;
const configurationTemplate=incidents.find(item=>item.id==="container-host-config-v1")!;
const providerTemplate=incidents.find(item=>item.id==="provider-schema-drift-v1")!;
const webhookTemplate=incidents.find(item=>item.id==="webhook-replay-idempotency-v1")!;

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
};

export function scenarioFor(id:string):Scenario{const scenario=scenarios[id];if(!scenario)throw new Error("Incident template not found");return scenario}
