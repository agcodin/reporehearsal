import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../../auth";
import { updateAccountPreferences } from "../../../../src/accounts/account-service";
const schema = z.object({ defaultMode: z.enum(["GUIDED", "INDEPENDENT", "INTERVIEW"]), defaultTimeLimit: z.number().int().refine(value => [15, 25, 45, 60].includes(value)) });
export async function PUT(request: Request) { const user = await getAuthenticatedUser(); if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to update account preferences." } }, { status: 401 }); const input = schema.safeParse(await request.json()); if (!input.success) return NextResponse.json({ error: { code: "INVALID_PREFERENCES", message: "Choose a supported mode and time limit." } }, { status: 400 }); return NextResponse.json({ profile: await updateAccountPreferences(user.email, user.displayName, input.data) }); }
