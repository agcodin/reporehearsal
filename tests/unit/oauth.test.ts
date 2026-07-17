import { afterEach, describe, expect, it } from "vitest";
import { buildAuthorizationUrl, callbackUrl, isOAuthProvider, providerIsConfigured } from "../../src/auth/oauth-providers";

const original = {
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  GITHUB_OAUTH_CLIENT_ID: process.env.GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET: process.env.GITHUB_OAUTH_CLIENT_SECRET,
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("OAuth provider configuration", () => {
  it("accepts only supported providers", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("github")).toBe(true);
    expect(isOAuthProvider("chatgpt")).toBe(false);
  });

  it("requires both halves of provider credentials", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client";
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(providerIsConfigured("google")).toBe(false);
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-secret";
    expect(providerIsConfigured("google")).toBe(true);
  });

  it("builds a Google authorization-code request with PKCE and minimal identity scopes", () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-secret";
    const url = buildAuthorizationUrl("google", { origin: "https://example.com", state: "state-value", codeChallenge: "challenge-value" });
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe("https://example.com/auth/google/callback");
  });

  it("builds a GitHub request with verified-email scope and PKCE", () => {
    process.env.GITHUB_OAUTH_CLIENT_ID = "github-client";
    process.env.GITHUB_OAUTH_CLIENT_SECRET = "github-secret";
    const url = buildAuthorizationUrl("github", { origin: "https://example.com", state: "state-value", codeChallenge: "challenge-value" });
    expect(url.origin).toBe("https://github.com");
    expect(url.searchParams.get("scope")).toBe("user:email");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(callbackUrl("https://example.com", "github")).toBe("https://example.com/auth/github/callback");
  });
});
