import { NextResponse } from "next/server";
import { cleanupExpiredRepositories } from "../../../../src/repositories/repository-service";
import { cleanupExpiredRehearsals } from "../../../../src/rehearsals/session-service";

export async function POST(request: Request) {
  const secret = process.env.CLEANUP_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: { code: "CLEANUP_NOT_CONFIGURED", message: "Cleanup is not configured." } }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Cleanup authorization failed." } }, { status: 403 });
  const [repositories, rehearsals] = await Promise.all([cleanupExpiredRepositories(), cleanupExpiredRehearsals()]);
  return NextResponse.json({ deleted: { repositories, rehearsals } });
}
