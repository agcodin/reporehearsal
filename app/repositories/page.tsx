import Link from "next/link";
import GitHubImportCard from "./GitHubImportCard";
import LocalUploadCard from "./LocalUploadCard";
import { getAuthenticatedUser, signInPath } from "../auth";
import { listGitHubRepositoryCatalog } from "../../src/auth/auth-service";

export const dynamic="force-dynamic";
const samples=[
  ["TypeScript","billing-api","Database-backed billing service with migrations, provider boundaries, and webhooks.",["DB","API"]],
  ["Python","inventory-worker","Queue-driven inventory reconciliation with retry and idempotency failures.",["CFG","API"]],
  ["Go","gateway-service","HTTP gateway with service discovery, timeouts, and health-check incidents.",["CFG","API"]],
  ["Java","orders-platform","Spring application with transactional and schema migration failure paths.",["DB","API"]],
  ["C#","identity-service","ASP.NET identity boundary with null contracts and configuration faults.",["CFG","API"]],
  ["Rust","event-processor","Typed event consumer with option handling and recovery scenarios.",["API"]],
] as const;
export default async function Repositories(){const user=await getAuthenticatedUser();const connected=user?.provider==="github"?await listGitHubRepositoryCatalog(user.email,user.displayName):[];return <main className="repositories-spec rr-container"><header><div><h1>Repositories</h1><p>Rehearse against our curated sample repositories, or connect your own. Every exercise runs on a temporary copy.</p></div><a className="button button-blue" href="#connect">Connect a repository</a></header><div className="repo-toolbar"><label>⌕<input placeholder="Search repositories" aria-label="Search repositories"/></label><div><button className="active">All</button><button>TypeScript</button><button>Python</button><button>Go</button><button>Java</button></div></div><p className="section-overline">CURATED SAMPLES</p><section className="sample-grid">{samples.map(([language,name,copy,tags])=><article key={name}><header><i/><b>{name}</b><small>{language}</small></header><p>{copy}</p><footer>{tags.map(tag=><span key={tag}>{tag}</span>)}<Link className="button button-ghost" href="/rehearsals/new">Rehearse →</Link></footer></article>)}</section><section className="connect-panel" id="connect"><header><h3>Bring your own repository</h3><p>Your source is copied to a temporary workspace, secrets are redacted, and the original is never modified.</p><ul><li>Redacted secrets</li><li>Allowlisted commands</li><li>Expiring workspaces</li><li>Read-only source</li></ul></header><div className="connect-options">{user?<><GitHubImportCard connectedRepositories={connected}/><LocalUploadCard/></>:<div className="connect-signin"><p>Sign in to import a public GitHub repository or upload code from your computer.</p><Link className="button button-dark" href={signInPath("/repositories")}>Sign in to connect</Link></div>}<Link className="text-link" href="/repositories/curated">Choose a random public repository →</Link><Link className="text-link" href="/privacy">How isolation works →</Link></div></section></main>}
