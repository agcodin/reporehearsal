import type { Metadata } from "next";
import EnterpriseStudio from "../../enterprise/EnterpriseStudio";
import { getAuthenticatedUser } from "../../auth";

export const metadata: Metadata = { title: "Team incident studio", description: "Design custom incident programs and configure reliability-training controls." };
export default async function TeamStudioPage() { const user=await getAuthenticatedUser(); return <EnterpriseStudio isAuthenticated={Boolean(user)} />; }
