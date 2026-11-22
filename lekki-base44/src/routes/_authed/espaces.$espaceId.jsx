import { createFileRoute } from "@tanstack/react-router";
import { NotebookView } from "@/components/notebook/NotebookView";

export const Route = createFileRoute("/_authed/espaces/$espaceId")({
  head: () => ({ meta: [{ title: "Espace · Lekki" }] }),
  component: EspacePage,
});

function EspacePage() {
  const { espaceId } = Route.useParams();
  return <NotebookView espaceId={espaceId} />;
}