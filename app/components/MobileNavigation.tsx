"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlan } from "./PlanProvider";

const links = [
  ["Challenge of the Day", "/daily"],
  ["Dashboard", "/dashboard"],
  ["Repositories", "/repositories"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
] as const;

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const { plan, ready } = usePlan();

  return <div className="mobile-navigation">
    <button className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(value => !value)}>
      <span aria-hidden>{open ? "×" : "☰"}</span><span>Menu</span>
    </button>
    {open && <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile navigation">
      {links.map(([label, href]) => <Link href={href} onClick={() => setOpen(false)} key={href}>{label}</Link>)}
      <Link className="mobile-plan-link" href="/pricing" onClick={() => setOpen(false)}>Current plan <b>{ready ? plan.name : "Free"}</b></Link>
    </nav>}
  </div>;
}
