import { describe, expect, it } from "vitest";
import { GET as sitemap } from "../../app/sitemap.xml/route";
import { GET as robots } from "../../app/robots.txt/route";

describe("search documents", () => {
  it("publishes every important public route in valid sitemap XML", async () => {
    const response = sitemap();
    const body = await response.text();
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
    expect(body).toContain("https://reporehearsal.com/pricing");
    expect(body).toContain("https://reporehearsal.com/team/studio");
    expect(body).not.toContain("/dashboard");
  });

  it("links robots.txt to the sitemap and keeps private routes out", async () => {
    const body = await robots().text();
    expect(body).toContain("Sitemap: https://reporehearsal.com/sitemap.xml");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
  });
});
