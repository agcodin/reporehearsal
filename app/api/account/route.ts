import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getAccountDashboard } from "../../../src/accounts/account-service";

export async function GET() { const user = await getChatGPTUser(); if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to view this account." } }, { status: 401 }); return NextResponse.json(await getAccountDashboard(user.email, user.displayName)); }
