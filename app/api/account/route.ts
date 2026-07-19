import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_SESSION_COOKIE, getAuthenticatedUser } from "../../auth";
import { deleteAccount, getAccountDashboard } from "../../../src/accounts/account-service";

export async function GET() { const user = await getAuthenticatedUser(); if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to view this account." } }, { status: 401 }); return NextResponse.json(await getAccountDashboard(user.email, user.displayName)); }

const deleteSchema=z.object({confirmation:z.string().trim().email().max(254)});
export async function DELETE(request:NextRequest){try{const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:{code:"AUTHENTICATION_REQUIRED",message:"Sign in to delete this account."}},{status:401});const input=deleteSchema.safeParse(await request.json());if(!input.success||input.data.confirmation.toLowerCase()!==user.email.toLowerCase())return NextResponse.json({error:{code:"CONFIRMATION_MISMATCH",message:"Enter the account email exactly to confirm deletion."}},{status:400});await deleteAccount(user.email);const response=NextResponse.json({deleted:true});response.cookies.set(AUTH_SESSION_COOKIE,"",{httpOnly:true,secure:request.nextUrl.protocol==="https:",sameSite:"lax",path:"/",maxAge:0});return response;}catch(error){console.error("Account deletion failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:{code:"ACCOUNT_DELETE_FAILED",message:"The account deletion could not be completed. Please try again."}},{status:500});}}
