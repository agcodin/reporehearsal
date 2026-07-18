import type { Metadata } from "next";
import DailyChallenge from "./DailyChallenge";
import { dailyChallenge } from "../../src/rehearsals/daily";

export const metadata: Metadata = { title: "Challenge of the Day", description: "Solve the same five-file repository incident as everyone else today." };
export default function DailyPage() { const challenge = dailyChallenge(); return <DailyChallenge challenge={{ ...challenge, incident: { name: challenge.incident.name, summary: challenge.incident.summary, category: challenge.incident.category } }} />; }
