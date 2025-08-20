import { FantasyLeaderboard } from "@/components/fantasy-leaderboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fantasy Premier League Leaderboard - FPL Vntrip",
  description: "View and track Fantasy Premier League leaderboards with detailed team statistics and player information. Real-time points, team formations, and live scoring data.",
  keywords: ["Fantasy Premier League", "FPL", "leaderboard", "football", "soccer", "vntrip"],
  authors: [{ name: "Nguyen Tuan" }],
  openGraph: {
    title: "Fantasy Premier League Leaderboard - FPL Vntrip",
    description: "View and track Fantasy Premier League leaderboards with detailed team statistics and player information.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fantasy Premier League Leaderboard - FPL Vntrip",
    description: "View and track Fantasy Premier League leaderboards with detailed team statistics and player information.",
  },
};

export default function Home() {
  return (
    <FantasyLeaderboard />
  );
}
