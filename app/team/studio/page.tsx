import type { Metadata } from "next";
import EnterpriseStudio from "../../enterprise/EnterpriseStudio";

export const metadata: Metadata = { title: "Team incident studio", description: "Design custom incident programs and configure reliability-training controls." };
export default function TeamStudioPage() { return <EnterpriseStudio />; }
