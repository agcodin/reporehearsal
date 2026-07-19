"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function AccountMenu({ displayName, initials, signOutHref }: { displayName: string; initials: string; signOutHref: string }) {
  const [open,setOpen]=useState(false); const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{function close(event:PointerEvent){if(root.current&&!root.current.contains(event.target as Node))setOpen(false)}function escape(event:KeyboardEvent){if(event.key==="Escape")setOpen(false)}document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[]);
  return <div className="account-nav" ref={root}><button type="button" className="account-link" aria-label={`Account menu for ${displayName}`} aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(value=>!value)}><span className="account-avatar">{initials}</span><span className="account-nav-copy"><b>{displayName}</b><small>Account</small></span><span className="account-menu-chevron" aria-hidden>⌄</span></button>{open&&<div className="account-menu" role="menu"><Link role="menuitem" href="/account" onClick={()=>setOpen(false)}>Settings</Link><Link role="menuitem" href="/privacy" onClick={()=>setOpen(false)}>Privacy policy</Link><Link role="menuitem" className="account-menu-signout" href={signOutHref}>Sign out</Link></div>}</div>;
}
