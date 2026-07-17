import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, safeRelativeReturnPath } from "../../auth";
import { deleteAuthSession } from "../../../src/auth/auth-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (token) await deleteAuthSession(token);
  const returnTo = safeRelativeReturnPath(request.nextUrl.searchParams.get("return_to"));
  const response = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
