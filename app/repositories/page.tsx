import Link from "next/link";
import GitHubImportCard from "./GitHubImportCard";
import LocalUploadCard from "./LocalUploadCard";
import { getAuthenticatedUser, signInPath } from "../auth";
import { listGitHubRepositoryCatalog } from "../../src/auth/auth-service";
import SampleRepositoryCatalog, { type SampleRepository } from "./SampleRepositoryCatalog";

export const dynamic="force-dynamic";
const samples:readonly SampleRepository[]=[
  {id:"sample-billing-api",language:"TypeScript",name:"billing-api",description:"Database-backed billing service with migrations, provider boundaries, and webhooks.",tags:["DB","API"]},
  {id:"sample-inventory-worker",language:"Python",name:"inventory-worker",description:"Queue-driven inventory reconciliation with retry and missing-value failures.",tags:["CFG","API"]},
  {id:"sample-gateway-service",language:"Go",name:"gateway-service",description:"HTTP gateway with explicit error handling, timeouts, and health-check incidents.",tags:["CFG","API"]},
  {id:"sample-orders-platform",language:"Java",name:"orders-platform",description:"Java application with transactional and null-contract failure paths.",tags:["DB","API"]},
  {id:"sample-identity-service",language:"C#",name:"identity-service",description:"ASP.NET identity boundary with null contracts and configuration faults.",tags:["CFG","API"]},
  {id:"sample-event-processor",language:"Rust",name:"event-processor",description:"Typed event consumer with Option handling and recovery scenarios.",tags:["API"]},
];
export default async function Repositories(){const user=await getAuthenticatedUser();const connected=user?.provider==="github"?await listGitHubRepositoryCatalog(user.email,user.displayName):[];return <main className="repositories-spec rr-container"><header><div><h1>Repositories</h1><p>Rehearse against our curated sample repositories, or connect your own. Every exercise runs on a temporary copy.</p></div><a className="button button-blue" href="#connect">Connect a repository</a></header><SampleRepositoryCatalog samples={samples}/><section className="connect-panel" id="connect"><header><h3>Bring your own repository</h3><p>Your source is copied to a temporary workspace, secrets are redacted, and the original is never modified.</p><ul><li>Redacted secrets</li><li>Allowlisted commands</li><li>Expiring workspaces</li><li>Read-only source</li></ul></header><div className="connect-options">{user?<><GitHubImportCard connectedRepositories={connected}/><LocalUploadCard/></>:<div className="connect-signin"><p>Sign in to import a public GitHub repository or upload code from your computer.</p><Link className="button button-dark" href={signInPath("/repositories")}>Sign in to connect</Link></div>}<Link className="text-link" href="/repositories/curated">Choose a random public repository →</Link><Link className="text-link" href="/privacy">How isolation works →</Link></div></section></main>}
