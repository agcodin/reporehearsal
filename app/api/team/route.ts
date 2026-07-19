import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../auth";
import { planFromRequest } from "../../../src/billing/plans";
import { createTeamAssignment, getTeamDashboard, inviteTeamMember, leaveTeam, removeTeamMember, TeamServiceError } from "../../../src/team/team-service";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), email: z.string().trim().email().max(254) }),
  z.object({ action: z.literal("remove-member"), memberId: z.string().uuid() }),
  z.object({ action: z.literal("leave-team"), teamId: z.string().uuid() }),
  z.object({ action: z.literal("create-assignment"), repositoryId: z.string().min(1).max(100), incidentTemplateId: z.string().min(3).max(100), incidentName: z.string().min(3).max(120), assignedToEmail: z.union([z.literal("all"), z.string().email().max(254)]) }),
]);

function failure(error: unknown) {
  if (error instanceof TeamServiceError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  console.error("Team API error", error);
  return NextResponse.json({ error: { code: "TEAM_UNAVAILABLE", message: "The team workspace is temporarily unavailable." } }, { status: 500 });
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to manage a Team subscription." } }, { status: 401 });
  try { return NextResponse.json(await getTeamDashboard(user, { allowOwnerCreation: planFromRequest(request).id === "TEAM" })); } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to manage a Team subscription." } }, { status: 401 });
  const input = actionSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: { code: "INVALID_TEAM_ACTION", message: "Check the invitation or assignment details and try again." } }, { status: 400 });
  if (input.data.action !== "leave-team" && planFromRequest(request).id !== "TEAM") return NextResponse.json({ error: { code: "TEAM_PLAN_REQUIRED", message: "A Team plan is required to manage members and assignments." } }, { status: 403 });
  try {
    if (input.data.action === "invite") return NextResponse.json(await inviteTeamMember(user, input.data.email), { status: 201 });
    if (input.data.action === "remove-member") return NextResponse.json(await removeTeamMember(user, input.data.memberId));
    if (input.data.action === "leave-team") return NextResponse.json(await leaveTeam(user, input.data.teamId));
    return NextResponse.json(await createTeamAssignment(user, input.data), { status: 201 });
  } catch (error) { return failure(error); }
}
