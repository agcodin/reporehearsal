import type { Metadata } from "next";
import TeamStudioPreview from "./TeamStudioPreview";

export const metadata: Metadata = {
  title: "Interactive Team Incident Studio demo",
  description: "Try the complete Team workflow: import a reviewed change, approve an incident contract, invite a teammate, and assign the challenge."
};

export default function StudioDemo() {
  return <TeamStudioPreview />;
}
