import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, OAUTH_STATE_COOKIE } from "../../../auth";
import { consumeLoginAttempt, createAuthSession } from "../../../../src/auth/auth-service";
import { exchangeAuthorizationCode, isOAuthProvider, OAuthProviderError } from "../../../../src/auth/oauth-providers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return failure(request, "provider");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");
  if (!state || !cookieState || state !== cookieState) return failure(request, "state", provider);

  const attempt = await consumeLoginAttempt(provider, state);
  if (!attempt) return failure(request, "expired", provider);
  if (request.nextUrl.searchParams.has("error") || !code) return failure(request, "cancelled", provider);

  try {
    const identity = await exchangeAuthorizationCode(provider, { origin: request.nextUrl.origin, code, codeVerifier: attempt.codeVerifier });
    const session = await createAuthSession({ provider, ...identity });
    const response = NextResponse.redirect(new URL(attempt.returnTo, request.nextUrl.origin));
    clearStateCookie(response, request);
    response.cookies.set(AUTH_SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch (error) {
    const code = error instanceof OAuthProviderError ? error.code.toLowerCase() : "callback_failed";
    return failure(request, code, provider);
  }
}

function failure(request: NextRequest, error: string, provider?: string): NextResponse {
  const url = new URL("/signin", request.nextUrl.origin);
  url.searchParams.set("error", error);
  if (provider) url.searchParams.set("provider", provider);
  const response = NextResponse.redirect(url);
  clearStateCookie(response, request);
  return response;
}

function clearStateCookie(response: NextResponse, request: NextRequest): void {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/auth", maxAge: 0 });
}
