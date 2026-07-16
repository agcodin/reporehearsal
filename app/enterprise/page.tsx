import type { Metadata } from "next";
import EnterpriseStudio from "./EnterpriseStudio";

export const metadata: Metadata = { title: "Enterprise controls", description: "Design custom incident programs and configure reliability-training controls." };
export default function EnterprisePage() { return <EnterpriseStudio />; }
