import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../auth";
import { getRepository, loadRepositoryFiles, RepositoryAccessError } from "../../../../../src/repositories/repository-service";
import { incidentCandidatePreviews } from "../../../../../src/incidents/brain";

// The discovered faults a repository can be rehearsed against; the wizard lists these so a
// solved repository can be re-rolled against a different boundary.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    const repository = await getRepository(id, user ? { email: user.email, displayName: user.displayName } : null, request.headers.get("x-repository-access"));
    const files = await loadRepositoryFiles(repository);
    return NextResponse.json({ candidates: incidentCandidatePreviews(files) });
  } catch (error) {
    if (error instanceof RepositoryAccessError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    throw error;
  }
}
