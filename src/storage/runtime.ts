import { env } from "cloudflare:workers";

export function runtimeDatabase(): D1Database {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

export function repositoryBucket(): R2Bucket {
  if (!env.REPOSITORIES) throw new Error("Repository object storage binding is unavailable");
  return env.REPOSITORIES;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function accessToken(): string { return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", ""); }
