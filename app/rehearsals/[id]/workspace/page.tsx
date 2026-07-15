import Workspace from "./Workspace";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workspace sessionId={id} />;
}
