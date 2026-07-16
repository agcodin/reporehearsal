import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = { title: "Pricing", description: "Choose a RepoRehearsal plan for individual incident practice, team readiness, or custom reliability training." };
export default function PricingPage() { return <PricingClient />; }
