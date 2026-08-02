import { describe, expect, it } from "vitest";
import { fetchPublicPullRequestDiff, parseGitHubPullRequestUrl } from "../../src/incidents/github-pr";

const diff = `diff --git a/src/provider.ts b/src/provider.ts
index 1111111..2222222 100644
--- a/src/provider.ts
+++ b/src/provider.ts
@@ -1 +1 @@
-return response.json()
+if (!response.ok) throw new Error(String(response.status))`;

describe("GitHub pull request incident import", () => {
  it("accepts only canonical public pull request URLs", () => {
    expect(parseGitHubPullRequestUrl("https://github.com/acme/billing/pull/42")).toMatchObject({ owner: "acme", repository: "billing", number: 42 });
    expect(() => parseGitHubPullRequestUrl("https://github.com/acme/billing/issues/42")).toThrow(/pull request page URL/);
    expect(() => parseGitHubPullRequestUrl("https://example.com/acme/billing/pull/42")).toThrow(/Only public/);
    expect(() => parseGitHubPullRequestUrl("https://user:secret@github.com/acme/billing/pull/42")).toThrow(/Only public/);
  });

  it("downloads the bounded diff and preserves the source PR", async () => {
    let requested = "";
    const fetcher: typeof fetch = async input => { requested = String(input); return new Response(diff, { status: 200, headers: { "content-type": "text/plain" } }); };
    const source = await fetchPublicPullRequestDiff("https://github.com/acme/billing/pull/42", fetcher);
    expect(requested).toBe("https://github.com/acme/billing/pull/42.diff");
    expect(source.diff).toContain("+++ b/src/provider.ts");
    expect(source.canonicalUrl).toBe("https://github.com/acme/billing/pull/42");
  });

  it("rejects oversized pull requests before reading them", async () => {
    const fetcher: typeof fetch = async () => new Response("", { status: 200, headers: { "content-length": "200001" } });
    await expect(fetchPublicPullRequestDiff("https://github.com/acme/billing/pull/42", fetcher)).rejects.toMatchObject({ code: "PULL_REQUEST_TOO_LARGE", status: 413 });
  });
});
