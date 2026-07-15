import { Suspense } from "react";import RehearsalSetup from "./RehearsalSetup";
export default function NewRehearsal(){return <Suspense fallback={<main className="app-page"><div className="account-loading"><span className="pulse"/> Loading rehearsal options…</div></main>}><RehearsalSetup/></Suspense>}
