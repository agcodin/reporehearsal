import Link from "next/link";

export default function NotFound() {
  return <main className="not-found-page">
    <div>
      <p className="not-found-code">404</p>
      <h1>Page not found</h1>
      <p>The page may have moved, or the address may be incorrect.</p>
      <div className="actions"><Link className="button button-dark" href="/">Back to home</Link><Link className="button button-ghost" href="/rehearsals/new">Browse incidents</Link></div>
    </div>
  </main>;
}
