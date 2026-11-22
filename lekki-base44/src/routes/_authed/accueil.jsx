import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/components/home/HomeView";

export const Route = createFileRoute("/_authed/accueil")({
  head: () => ({ meta: [{ title: "Mes espaces · Lekki" }] }),
  component: HomeView,
});