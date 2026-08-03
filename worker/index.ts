/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { cleanupExpiredRepositories } from "../src/repositories/repository-service";
import { cleanupExpiredRehearsals } from "../src/rehearsals/session-service";
import { applyResponsePolicy } from "./response-policy";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === "www.reporehersal.com") {
      url.hostname = "reporehersal.com";
      return applyResponsePolicy(request, Response.redirect(url, 308));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return applyResponsePolicy(request, response);
    }

    const response = await handler.fetch(request, env, ctx);
    return applyResponsePolicy(request, response);
  },

  // Cron triggers invoke scheduled(), never an HTTP route, so this calls the cleanup
  // functions directly. Errors propagate so a failed purge shows up as a failed invocation
  // rather than silently leaving expired workspaces in R2 and D1.
  async scheduled(_controller: ScheduledController, _env: Env, _ctx: ExecutionContext): Promise<void> {
    const [repositories, rehearsals] = await Promise.all([cleanupExpiredRepositories(), cleanupExpiredRehearsals()]);
    console.log("Scheduled cleanup complete", { repositories, rehearsals });
  },
};

export default worker;
