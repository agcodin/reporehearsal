import { test,expect } from "@playwright/test";
test("demo API exposes repository and approved command policy",async({request})=>{const repositories=await request.get("/api/repositories");expect(repositories.ok()).toBeTruthy();expect((await repositories.json()).repositories[0].id).toBe("billing-demo");const blocked=await request.post("/api/rehearsals/demo/commands",{data:{commandId:"curl-external-site"}});expect(blocked.status()).toBe(403);const approved=await request.post("/api/rehearsals/demo/commands",{data:{commandId:"run-tests"}});expect(approved.ok()).toBeTruthy()});
test("GitHub import rejects non-GitHub hosts before fetching",async({request})=>{const response=await request.post("/api/repositories/github",{data:{url:"https://example.com/acme/repository"}});expect(response.status()).toBe(400);expect((await response.json()).error.code).toBe("UNSUPPORTED_HOST")});
test("account APIs require server-verified identity",async({request})=>{const account=await request.get("/api/account");expect(account.status()).toBe(401);expect((await account.json()).error.code).toBe("AUTHENTICATION_REQUIRED");const save=await request.post("/api/account/rehearsals",{data:{id:"16a8991b-1aa7-46c2-9ddb-f11e2550c601",incidentTemplateId:"db-required-field-migration-v1",incidentName:"Required field migration",repositoryName:"Billing Demo",mode:"GUIDED",status:"COMPLETED",score:90,durationMinutes:18,hintsUsed:0}});expect(save.status()).toBe(401)});
test("local upload rejects unsupported files safely",async({request})=>{const response=await request.post("/api/repositories/upload",{multipart:{archive:{name:"repository.txt",mimeType:"text/plain",buffer:Buffer.from("not a zip")}}});expect(response.status()).toBe(400);expect((await response.json()).error.code).toBe("INVALID_FILE_TYPE")});

test("anonymous rehearsal completes through the server-owned lifecycle",async({request})=>{
  const created=await request.post("/api/rehearsals",{data:{repositoryId:"billing-demo",incidentTemplateId:"db-required-field-migration-v1",difficulty:"INTERMEDIATE",mode:"GUIDED",timeLimitMinutes:25}});
  expect(created.status()).toBe(201);
  const body=await created.json(); const id=body.session.id as string; const token=body.accessToken as string; const headers={"x-rehearsal-access":token};
  expect((await request.post(`/api/rehearsals/${id}/prepare`,{headers})).ok()).toBeTruthy();
  expect((await request.post(`/api/rehearsals/${id}/start`,{headers})).ok()).toBeTruthy();
  const evidence=await (await request.get(`/api/rehearsals/${id}/evidence`,{headers})).json();
  expect(evidence.evidence.targetPath).toBe("src/services/billing.ts");
  const repair=`export function serializeBilling(profile: BillingProfile) { return { billingRegion: (profile.billingRegion ?? "US").toUpperCase() }; }
export function createPartnerProfile(input: PartnerAccount) { return { billingRegion: input.billingRegion ?? "US" }; }
// UPDATE billing_profiles SET billing_region = 'US' WHERE billing_region IS NULL;`;
  const saved=await request.put(`/api/rehearsals/${id}/files/content`,{headers,data:{path:evidence.evidence.targetPath,content:repair}});
  expect(saved.ok()).toBeTruthy();
  const tests=await request.post(`/api/rehearsals/${id}/commands`,{headers,data:{commandId:"run-tests"}});
  expect((await tests.json()).result.exitCode).toBe(0);
  const submitted=await request.post(`/api/rehearsals/${id}/submit`,{headers});
  const result=await submitted.json(); expect(result.validation.passed).toBe(true); expect(result.report.score).toBeGreaterThan(80);
  const report=await request.get(`/api/rehearsals/${id}/report`,{headers});
  expect(report.ok()).toBeTruthy(); expect((await report.json()).report.passed).toBe(true);
});
