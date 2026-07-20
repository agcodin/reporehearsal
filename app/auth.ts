import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSession, type AuthenticatedUser, type AuthProvider } from "../src/auth/auth-service";

export type { AuthenticatedUser, AuthProvider };

export const AUTH_SESSION_COOKIE = "rr_session";
export const OAUTH_STATE_COOKIE = "rr_oauth_state";

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const GATEWAY_SECRET_HEADER = "x-gateway-identity-secret";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const sessionToken = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const sessionUser = await getAuthSession(sessionToken);
    if (sessionUser) return sessionUser;
  }
  return gatewayIdentity(await headers());
}

// Identity asserted by request headers is only trustworthy behind a gateway that strips
// them from client traffic. GATEWAY_IDENTITY_SECRET MUST stay unset on any deployment
// reachable directly (the Worker), or callers can name themselves any user.
function gatewayIdentity(requestHeaders: Headers): AuthenticatedUser | null {
  const secret = process.env.GATEWAY_IDENTITY_SECRET?.trim();
  if (!secret || requestHeaders.get(GATEWAY_SECRET_HEADER) !== secret) return null;
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) return null;
  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName = encodedFullName && requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
    ? safeDecodeURIComponent(encodedFullName)
    : null;
  return { displayName: fullName ?? email, email: email.toLowerCase(), fullName, provider: "chatgpt" };
}

export async function requireAuthenticatedUser(returnTo: string): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}

export function signInPath(returnTo: string): string {
  return `/signin?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function oauthSignInPath(provider: Exclude<AuthProvider, "chatgpt">, returnTo: string): string {
  return `/auth/${provider}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function signOutPath(returnTo = "/"): string {
  return `/auth/signout?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function safeRelativeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  let url: URL;
  try { url = new URL(value, "https://app.local"); } catch { return "/"; }
  if (url.origin !== "https://app.local" || isReservedAuthPath(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

export function providerLabel(provider: AuthProvider): string {
  return provider === "chatgpt" ? "ChatGPT" : provider === "google" ? "Google" : "GitHub";
}

function isReservedAuthPath(pathname: string): boolean {
  return pathname === "/callback" || pathname === "/signin" || pathname.startsWith("/auth/");
}

function safeDecodeURIComponent(value: string): string | null {
  try { return decodeURIComponent(value); } catch { return null; }
}
