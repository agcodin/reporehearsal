import PreparingSession from "./PreparingSession";

export default async function PreparingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreparingSession sessionId={id} />;
}
