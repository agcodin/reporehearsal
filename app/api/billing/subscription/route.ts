import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../auth";
import { BillingError, billingSummary } from "../../../../src/billing/stripe";
export async function GET() { try { const user = await getAuthenticatedUser(); if (!user) return NextResponse.json({ configured: false, plan: "FREE", status: "guest", cancelAtPeriodEnd: false, currentPeriodEnd: null }); return NextResponse.json(await billingSummary(user)); } catch (error) { return NextResponse.json({ error: { code: error instanceof BillingError ? error.code : "BILLING_UNAVAILABLE", message: error instanceof Error ? error.message : "Billing is unavailable." } }, { status: error instanceof BillingError ? error.status : 500 }); } }
