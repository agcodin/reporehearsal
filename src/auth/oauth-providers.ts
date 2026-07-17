import type { AuthProvider, GitHubRepositorySummary } from "./auth-service";

type OAuthProvider = Exclude<AuthProvider, "chatgpt">;
type ProviderIdentity = { subject: string; email: string; displayName: string; githubRepositories?: GitHubRepositorySummary[] };

export class OAuthProviderError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

export function providerIsConfigured(provider: OAuthProvider): boolean {
  return Boolean(credentials(provider));
}

export function buildAuthorizationUrl(provider: OAuthProvider, input: {
  origin: string;
  state: string;
  codeChallenge: string;
}): URL {
  const configured = credentials(provider);
  if (!configured) throw new OAuthProviderError("PROVIDER_NOT_CONFIGURED", `${provider} sign-in is not configured.`);
  const redirectUri = callbackUrl(input.origin, provider);
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: configured.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    return url;
  }
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: configured.clientId,
    redirect_uri: redirectUri,
    scope: "user:email",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url;
}

export async function exchangeAuthorizationCode(provider: OAuthProvider, input: {
  origin: string;
  code: string;
  codeVerifier: string;
}): Promise<ProviderIdentity> {
  const configured = credentials(provider);
  if (!configured) throw new OAuthProviderError("PROVIDER_NOT_CONFIGURED", `${provider} sign-in is not configured.`);
  const redirectUri = callbackUrl(input.origin, provider);
  if (provider === "google") return googleIdentity(configured, redirectUri, input.code, input.codeVerifier);
  return githubIdentity(configured, redirectUri, input.code, input.codeVerifier);
}

export function callbackUrl(origin: string, provider: OAuthProvider): string {
  return new URL(`/auth/${provider}/callback`, origin).toString();
}

function credentials(provider: OAuthProvider): { clientId: string; clientSecret: string } | null {
  const prefix = provider === "google" ? "GOOGLE" : "GITHUB";
  const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_OAUTH_CLIENT_SECRET`]?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

async function googleIdentity(configured: { clientId: string; clientSecret: string }, redirectUri: string, code: string, verifier: string): Promise<ProviderIdentity> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: configured.clientId, client_secret: configured.clientSecret, code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri }),
  });
  const tokens = await readJson<{ access_token?: string; error?: string }>(tokenResponse);
  if (!tokenResponse.ok || !tokens.access_token) throw new OAuthProviderError("TOKEN_EXCHANGE_FAILED", "Google did not accept the authorization response.");
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" } });
  const profile = await readJson<{ sub?: string; email?: string; email_verified?: boolean; name?: string }>(profileResponse);
  if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) throw new OAuthProviderError("VERIFIED_EMAIL_REQUIRED", "Google did not provide a verified email address.");
  return { subject: profile.sub, email: profile.email.toLowerCase(), displayName: profile.name?.trim() || profile.email.split("@")[0] };
}

async function githubIdentity(configured: { clientId: string; clientSecret: string }, redirectUri: string, code: string, verifier: string): Promise<ProviderIdentity> {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: configured.clientId, client_secret: configured.clientSecret, code, code_verifier: verifier, redirect_uri: redirectUri }),
  });
  const tokens = await readJson<{ access_token?: string; token_type?: string; error?: string }>(tokenResponse);
  if (!tokenResponse.ok || !tokens.access_token) throw new OAuthProviderError("TOKEN_EXCHANGE_FAILED", "GitHub did not accept the authorization response.");
  const headers = { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "RepoRehearsal", "X-GitHub-Api-Version": "2022-11-28" };
  const [profileResponse, emailsResponse, repositoriesResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
    fetch("https://api.github.com/user/repos?visibility=public&affiliation=owner&sort=updated&per_page=100", { headers }),
  ]);
  const profile = await readJson<{ id?: number; login?: string; name?: string }>(profileResponse);
  const emails = await readJson<Array<{ email?: string; primary?: boolean; verified?: boolean }>>(emailsResponse);
  const repositories = await readJson<Array<{ id?: number; name?: string; full_name?: string; html_url?: string; description?: string | null; language?: string | null; default_branch?: string; updated_at?: string; private?: boolean }>>(repositoriesResponse, 1024 * 1024);
  const verified = Array.isArray(emails) ? emails.filter(item => item.verified && item.email) : [];
  const email = verified.find(item => item.primary)?.email ?? verified[0]?.email;
  if (!profileResponse.ok || !emailsResponse.ok || !profile.id || !email) throw new OAuthProviderError("VERIFIED_EMAIL_REQUIRED", "GitHub did not provide a verified email address.");
  const githubRepositories = repositoriesResponse.ok && Array.isArray(repositories) ? repositories.flatMap(repository => {
    if (repository.private || !repository.id || !repository.name || !repository.full_name || !repository.html_url) return [];
    return [{ id: String(repository.id), name: repository.name, fullName: repository.full_name, sourceUrl: repository.html_url, description: repository.description ?? null, language: repository.language ?? null, defaultBranch: repository.default_branch ?? "main", updatedAt: repository.updated_at ?? new Date(0).toISOString() }];
  }) : [];
  return { subject: String(profile.id), email: email.toLowerCase(), displayName: profile.name?.trim() || profile.login?.trim() || email.split("@")[0], githubRepositories };
}

async function readJson<T>(response: Response, maxBytes = 128 * 1024): Promise<T> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new OAuthProviderError("PROVIDER_RESPONSE_TOO_LARGE", "The identity provider returned an invalid response.");
  if (!response.body) throw new OAuthProviderError("PROVIDER_RESPONSE_INVALID", "The identity provider returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new OAuthProviderError("PROVIDER_RESPONSE_TOO_LARGE", "The identity provider returned an invalid response."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T; }
  catch { throw new OAuthProviderError("PROVIDER_RESPONSE_INVALID", "The identity provider returned an invalid response."); }
}
