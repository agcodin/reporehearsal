const origin = "https://reporehearsal.com";

const routes = [
  ["/", "weekly", "1.0"],
  ["/pricing", "monthly", "0.9"],
  ["/daily", "daily", "0.9"],
  ["/rehearsals/new", "weekly", "0.9"],
  ["/repositories/curated", "weekly", "0.8"],
  ["/team/studio", "monthly", "0.8"],
  ["/recruiting", "monthly", "0.7"],
  ["/about", "monthly", "0.6"],
  ["/privacy", "yearly", "0.4"],
] as const;

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function GET() {
  const urls = routes.map(([path, changefreq, priority]) => `  <url>\n    <loc>${escapeXml(`${origin}${path}`)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
