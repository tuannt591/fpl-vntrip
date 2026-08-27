import { FantasyLeaderboard } from "@/components/fantasy-leaderboard";
import { redirect } from "next/navigation";

export default function Home({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  if (searchParams?.view === "h2h") redirect("/h2h");

  return (
    <FantasyLeaderboard />
  );
}
