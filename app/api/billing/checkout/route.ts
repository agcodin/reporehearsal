import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../../auth";
import { BillingError, createCheckout } from "../../../../src/billing/stripe";

const input = z.object({ plan: z.enum(["PRO", "TEAM"]), cadence: z.enum(["weekly", "monthly", "annual"]) });
export async function POST(request: Request) { try { const user = await getAuthenticatedUser(); if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in before starting checkout." } }, { status: 401 }); const body = input.safeParse(await request.json()); if (!body.success) return NextResponse.json({ error: { code: "INVALID_CHECKOUT", message: "Choose a paid plan and billing cadence." } }, { status: 400 }); return NextResponse.json(await createCheckout(user, request, body.data)); } catch (error) { const message = error instanceof BillingError ? error.message : "Checkout could not be started."; const status = error instanceof BillingError ? error.status : 500; return NextResponse.json({ error: { code: error instanceof BillingError ? error.code : "CHECKOUT_UNAVAILABLE", message } }, { status }); } }
