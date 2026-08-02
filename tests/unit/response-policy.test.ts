import { describe, expect, it } from "vitest";
import { applyResponsePolicy, CONTENT_SECURITY_POLICY } from "../../worker/response-policy";

function html(body = "<main>RepoRehearsal</main>") {
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

describe("Worker response policy", () => {
  it("adds the complete security baseline to HTML", () => {
    const response = applyResponsePolicy(new Request("https://example.com/about"), html());
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(response.headers.get("strict-transport-security")).toBe("max-age=31536000; includeSubDomains");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("caches only anonymous public documents", () => {
    const anonymous = applyResponsePolicy(new Request("https://example.com/pricing"), html());
    expect(anonymous.headers.get("cache-control")).toBe("public, max-age=300, stale-while-revalidate=3600");

    const personalized = applyResponsePolicy(new Request("https://example.com/pricing", { headers: { Cookie: "rr_session=secret" } }), html());
    expect(personalized.headers.get("cache-control")).toBe("no-store, must-revalidate");
  });

  it("keeps account pages and application payloads private", () => {
    const dashboard = applyResponsePolicy(new Request("https://example.com/dashboard"), html());
    expect(dashboard.headers.get("cache-control")).toBe("no-store, must-revalidate");

    const api = applyResponsePolicy(new Request("https://example.com/api/account"), new Response("{}", { headers: { "Content-Type": "application/json" } }));
    expect(api.headers.get("cache-control")).toBe("no-store, must-revalidate");
  });

  it("gives crawler documents a longer public cache policy", () => {
    const sitemap = applyResponsePolicy(new Request("https://example.com/sitemap.xml"), new Response("<urlset />", { headers: { "Content-Type": "application/xml" } }));
    expect(sitemap.headers.get("cache-control")).toBe("public, max-age=3600, stale-while-revalidate=86400");
  });

  it("preserves immutable asset caching", () => {
    const asset = applyResponsePolicy(new Request("https://example.com/assets/app.js"), new Response("export{}", { headers: { "Content-Type": "text/javascript", "Cache-Control": "public, max-age=31536000, immutable" } }));
    expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(asset.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
