const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /account
Disallow: /auth/
Disallow: /dashboard
Disallow: /rehearsals/*/workspace
Disallow: /rehearsals/*/report
Disallow: /repositories/*
Disallow: /signin
Disallow: /verify/

Content-Signal: search=yes, ai-input=yes, ai-train=no

Sitemap: https://reporehearsal.com/sitemap.xml
`;

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
