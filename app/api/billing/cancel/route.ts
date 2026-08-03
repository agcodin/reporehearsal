import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../auth";
import { BillingError, scheduleCancellation } from "../../../../src/billing/stripe";
export async function POST() { try { const user = await getAuthenticatedUser(); if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to cancel billing." } }, { status: 401 }); return NextResponse.json(await scheduleCancellation(user)); } catch (error) { return NextResponse.json({ error: { code: error instanceof BillingError ? error.code : "BILLING_UNAVAILABLE", message: error instanceof Error ? error.message : "Billing is unavailable." } }, { status: error instanceof BillingError ? error.status : 500 }); } }
