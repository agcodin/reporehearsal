import type { Metadata } from "next";
import CuratedCatalog from "./CuratedCatalog";

export const metadata: Metadata = { title: "Curated repository roulette" };

export default function CuratedRepositoriesPage() {
  return <CuratedCatalog />;
}
