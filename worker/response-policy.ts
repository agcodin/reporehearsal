const PUBLIC_DOCUMENT_PATHS = new Set([
  "/",
  "/about",
  "/daily",
  "/pricing",
  "/privacy",
  "/recruiting",
  "/repositories/curated",
]);

const SEARCH_DOCUMENT_PATHS = new Set(["/robots.txt", "/sitemap.xml"]);

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const PUBLIC_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";
const SEARCH_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
const PRIVATE_CACHE_CONTROL = "no-store, must-revalidate";

function isPersonalized(request: Request, response: Response): boolean {
  return Boolean(
    request.headers.get("cookie") ||
    request.headers.get("authorization") ||
    response.headers.get("set-cookie")
  );
}

function isDocument(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("text/html") ?? false;
}

function isApplicationPayload(response: Response): boolean {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/json") || contentType.includes("text/x-component");
}

function cacheControlFor(request: Request, response: Response, pathname: string): string | null {
  const safeMethod = request.method === "GET" || request.method === "HEAD";
  if (!safeMethod || isPersonalized(request, response)) return PRIVATE_CACHE_CONTROL;
  if (SEARCH_DOCUMENT_PATHS.has(pathname)) return SEARCH_CACHE_CONTROL;
  if (isDocument(response) && response.ok && PUBLIC_DOCUMENT_PATHS.has(pathname)) return PUBLIC_CACHE_CONTROL;
  if (isDocument(response) || isApplicationPayload(response) || pathname.startsWith("/api/") || pathname.startsWith("/auth/")) return PRIVATE_CACHE_CONTROL;
  return null;
}

export function applyResponsePolicy(request: Request, response: Response): Response {
  const pathname = new URL(request.url).pathname;
  const headers = new Headers(response.headers);

  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("X-XSS-Protection", "0");

  if (isDocument(response)) headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);

  const cacheControl = cacheControlFor(request, response, pathname);
  if (cacheControl) {
    headers.set("Cache-Control", cacheControl);
    headers.delete("Expires");
    headers.delete("Pragma");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
