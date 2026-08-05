import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, safeRelativeReturnPath } from "../../auth";
import { createLoginAttempt } from "../../../src/auth/auth-service";
import { buildAuthorizationUrl, isOAuthProvider, OAuthProviderError } from "../../../src/auth/oauth-providers";
import { consumeRateLimit, RateLimitError } from "../../../src/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return NextResponse.redirect(new URL("/signin?error=provider", request.url));
  try {
    await consumeRateLimit(request, `oauth-start:${provider}`, 20, 10 * 60);
    const attempt = await createLoginAttempt(provider, safeRelativeReturnPath(request.nextUrl.searchParams.get("return_to")));
    const authorizationUrl = buildAuthorizationUrl(provider, { origin: request.nextUrl.origin, state: attempt.state, codeChallenge: attempt.codeChallenge });
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(OAUTH_STATE_COOKIE, attempt.state, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/auth",
      maxAge: attempt.maxAgeSeconds,
    });
    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: error.message } },
        { status: 429, headers: { "Retry-After": String(error.retryAfter) } },
      );
    }
    const code = error instanceof OAuthProviderError && error.code === "PROVIDER_NOT_CONFIGURED" ? "not_configured" : "start_failed";
    return NextResponse.redirect(new URL(`/signin?error=${code}&provider=${provider}`, request.url));
  }
}
