import type { Metadata } from "next";
import TeamWorkspace from "./TeamWorkspace";

export const metadata: Metadata = { title: "Team readiness", description: "Assign incident practice and monitor engineering readiness." };
export default function TeamPage() { return <TeamWorkspace />; }
