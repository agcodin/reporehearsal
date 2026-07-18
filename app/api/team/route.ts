import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../auth";
import { createTeamAssignment, getTeamDashboard, inviteTeamMember, removeTeamMember, TeamServiceError } from "../../../src/team/team-service";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), email: z.string().trim().email().max(254) }),
  z.object({ action: z.literal("remove-member"), memberId: z.string().uuid() }),
  z.object({ action: z.literal("create-assignment"), repositoryId: z.string().min(1).max(100), incidentTemplateId: z.string().min(3).max(100), incidentName: z.string().min(3).max(120), assignedToEmail: z.union([z.literal("all"), z.string().email().max(254)]) }),
]);

function failure(error: unknown) {
  if (error instanceof TeamServiceError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  console.error("Team API error", error);
  return NextResponse.json({ error: { code: "TEAM_UNAVAILABLE", message: "The team workspace is temporarily unavailable." } }, { status: 500 });
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to manage a Team subscription." } }, { status: 401 });
  try { return NextResponse.json(await getTeamDashboard(user)); } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to manage a Team subscription." } }, { status: 401 });
  const input = actionSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: { code: "INVALID_TEAM_ACTION", message: "Check the invitation or assignment details and try again." } }, { status: 400 });
  try {
    if (input.data.action === "invite") return NextResponse.json(await inviteTeamMember(user, input.data.email), { status: 201 });
    if (input.data.action === "remove-member") return NextResponse.json(await removeTeamMember(user, input.data.memberId));
    return NextResponse.json(await createTeamAssignment(user, input.data), { status: 201 });
  } catch (error) { return failure(error); }
}
