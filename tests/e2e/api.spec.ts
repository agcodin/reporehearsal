import { test,expect } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
// Gateway identity is refused unless the running server shares this secret, so e2e runs
// need it in .dev.vars. An empty value here would silently turn every 4xx assertion into a 401.
const gatewaySecret=process.env.GATEWAY_IDENTITY_SECRET?.trim();
if(!gatewaySecret)throw new Error("Set GATEWAY_IDENTITY_SECRET in .dev.vars and export it for the e2e run.");
const authenticatedHeaders={"x-gateway-identity-secret":gatewaySecret,"oai-authenticated-user-email":"qa@reporehearsal.dev","oai-authenticated-user-full-name":"Repo%20QA","oai-authenticated-user-full-name-encoding":"percent-encoded-utf-8"};
test("public pages expose hardened headers while private pages remain uncached",async({request})=>{
  const pricing=await request.get("/pricing");
  expect(pricing.ok()).toBeTruthy();
  expect(pricing.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(pricing.headers()["strict-transport-security"]).toContain("max-age=31536000");
  expect(pricing.headers()["x-content-type-options"]).toBe("nosniff");
  expect(pricing.headers()["cache-control"]).toBe("public, max-age=300, stale-while-revalidate=3600");
  const dashboard=await request.get("/dashboard",{headers:authenticatedHeaders});
  expect(dashboard.ok()).toBeTruthy();
  expect(dashboard.headers()["cache-control"]).toBe("no-store, must-revalidate");
});
test("crawler documents publish the public route inventory",async({request})=>{
  const sitemap=await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("/team/studio");
  const robots=await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Sitemap: https://reporehearsal.com/sitemap.xml");
});
test("anonymous primary actions always have navigable fallbacks",async({page})=>{
  await page.goto("/rehearsals/new");
  const continueLink=page.getByRole("link",{name:"Continue",exact:true});
  await expect(continueLink).toHaveAttribute("href","/rehearsals/new?step=2");
  await continueLink.click();
  await expect(page).toHaveURL(/\/rehearsals\/new\?.*step=2/);
  await expect(page.getByRole("heading",{name:"Choose the kind of failure"})).toBeVisible();

  await page.goto("/team/studio");
  const preview=page.getByRole("link",{name:"Try the interactive Team preview →",exact:true});
  await expect(preview).toHaveAttribute("href","/team/studio/demo");
  await preview.click();
  await expect(page).toHaveURL(/\/team\/studio\/demo$/);
  await expect(page.getByRole("heading",{name:"Build and assign a safe incident."})).toBeVisible();
  await page.getByRole("button",{name:"Create review draft →"}).click();
  await expect(page.getByRole("heading",{name:"Approve the incident contract"})).toBeVisible();
  await page.getByRole("button",{name:"Approve incident →"}).click();
  await expect(page.getByRole("heading",{name:"Invite and assign"})).toBeVisible();
  await page.getByRole("button",{name:"Send invite"}).click();
  await page.getByRole("button",{name:"Assign challenge →"}).click();
  await expect(page.getByText("Assignment ready")).toBeVisible();
  await page.goto("/team/studio");
  const signin=page.getByRole("link",{name:"Sign in to create incidents",exact:true});
  await expect(signin).toHaveAttribute("href","/signin?return_to=%2Fteam%2Fstudio");
});
test("sign-in and the authenticated dashboard render their intended states",async({request})=>{
  const signin=await request.get("/signin");
  expect(signin.ok()).toBeTruthy();
  expect(await signin.text()).toContain("Sign in to RepoRehearsal");
  const dashboard=await request.get("/dashboard",{headers:authenticatedHeaders});
  expect(dashboard.ok()).toBeTruthy();
  const body=await dashboard.text();
  expect(body).toContain("Repo QA");
  expect(body).toContain("Start a rehearsal");
});
test("demo API exposes repository and approved command policy",async({request})=>{const repositories=await request.get("/api/repositories");expect(repositories.ok()).toBeTruthy();expect((await repositories.json()).repositories[0].id).toBe("billing-demo");const blocked=await request.post("/api/rehearsals/demo/commands",{data:{commandId:"curl-external-site"}});expect(blocked.status()).toBe(403);const approved=await request.post("/api/rehearsals/demo/commands",{data:{commandId:"run-tests"}});expect(approved.ok()).toBeTruthy()});
test("GitHub import rejects non-GitHub hosts before fetching",async({request})=>{const response=await request.post("/api/repositories/github",{headers:authenticatedHeaders,data:{url:"https://example.com/acme/repository"}});expect(response.status()).toBe(400);expect((await response.json()).error.code).toBe("UNSUPPORTED_HOST")});
test("account APIs require server-verified identity",async({request})=>{const account=await request.get("/api/account");expect(account.status()).toBe(401);expect((await account.json()).error.code).toBe("AUTHENTICATION_REQUIRED");const save=await request.post("/api/account/rehearsals",{data:{id:"16a8991b-1aa7-46c2-9ddb-f11e2550c601",incidentTemplateId:"db-required-field-migration-v1",incidentName:"Required field migration",repositoryName:"Billing Demo",mode:"GUIDED",status:"COMPLETED",score:90,durationMinutes:18,hintsUsed:0}});expect(save.status()).toBe(401)});
test("forged identity headers are refused without the gateway secret",async({request})=>{const forged={"oai-authenticated-user-email":"victim@reporehearsal.dev","oai-authenticated-user-full-name":"Victim","oai-authenticated-user-full-name-encoding":"percent-encoded-utf-8"};const account=await request.get("/api/account",{headers:forged});expect(account.status()).toBe(401);const wrongSecret=await request.get("/api/account",{headers:{...forged,"x-gateway-identity-secret":"not-the-secret"}});expect(wrongSecret.status()).toBe(401)});
test("local upload rejects unsupported files safely",async({request})=>{const response=await request.post("/api/repositories/upload",{headers:authenticatedHeaders,multipart:{archive:{name:"repository.txt",mimeType:"text/plain",buffer:Buffer.from("not a zip")}}});expect(response.status()).toBe(400);expect((await response.json()).error.code).toBe("INVALID_FILE_TYPE")});

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

test("uploaded source produces and scores a repository-derived incident",async({request})=>{
  const originalPackage=JSON.stringify({scripts:{test:"vitest run",build:"tsc"},devDependencies:{typescript:"5",vitest:"3"}},null,2);
  const archive=Buffer.from(zipSync({"quality-service/package.json":strToU8(originalPackage),"quality-service/src/index.ts":strToU8("export const ready = true;"),"quality-service/tests/index.test.ts":strToU8("test('ready', () => {});")}));
  const upload=await request.post("/api/repositories/upload",{headers:authenticatedHeaders,multipart:{archive:{name:"quality-service.zip",mimeType:"application/zip",buffer:archive}}});
  expect(upload.status()).toBe(200);
  const imported=await upload.json();const repositoryId=imported.repository.id as string;const repositoryToken=imported.accessToken as string;
  expect(imported.repository.compatibleIncidentIds).toContain("repository-generated-v1");
  const created=await request.post("/api/rehearsals",{data:{repositoryId,repositoryAccessToken:repositoryToken,incidentTemplateId:"repository-generated-v1",difficulty:"INTERMEDIATE",mode:"INDEPENDENT",timeLimitMinutes:30}});
  expect(created.status()).toBe(201);
  const body=await created.json();const id=body.session.id as string;const headers={"x-rehearsal-access":body.accessToken as string};
  expect((await request.post(`/api/rehearsals/${id}/prepare`,{headers})).ok()).toBeTruthy();
  expect((await request.post(`/api/rehearsals/${id}/start`,{headers})).ok()).toBeTruthy();
  const evidence=await (await request.get(`/api/rehearsals/${id}/evidence`,{headers})).json();
  expect(evidence.evidence.targetPath).toBe("package.json");expect(evidence.evidence.generated.engine).toBe("repository-brain-v1");
  expect((await request.get(`/api/rehearsals/${id}/files/content?path=package.json`,{headers})).ok()).toBeTruthy();
  expect((await request.get(`/api/rehearsals/${id}/logs`,{headers})).ok()).toBeTruthy();
  expect((await request.post(`/api/rehearsals/${id}/database/query`,{headers,data:{queryId:"dependency-state"}})).ok()).toBeTruthy();
  expect((await request.post(`/api/rehearsals/${id}/hypotheses`,{headers,data:{hypothesis:"The evidence shows the package test command points to a missing executable, so the repository-owned Vitest command must be restored."}})).ok()).toBeTruthy();
  expect((await request.put(`/api/rehearsals/${id}/files/content`,{headers,data:{path:"package.json",content:originalPackage}})).ok()).toBeTruthy();
  for(const commandId of ["run-tests","run-build","restart-service","check-health"]){expect((await request.post(`/api/rehearsals/${id}/commands`,{headers,data:{commandId}})).ok()).toBeTruthy();}
  const submitted=await request.post(`/api/rehearsals/${id}/submit`,{headers});expect(submitted.ok()).toBeTruthy();
  const result=await submitted.json();expect(result.validation.passed).toBe(true);expect(result.validation.score).toBeGreaterThanOrEqual(80);expect(result.validation.breakdown.reduce((sum:number,item:{earned:number})=>sum+item.earned,0)).toBe(result.validation.score);
});
