import { FantasyLeaderboard } from "@/components/fantasy-leaderboard";

export const metadata = {
  title: "Fantasy Premier League - Bảng Xếp Hạng",
  description: "Bảng xếp hạng Fantasy Premier League với thống kê điểm số theo League ID",
  openGraph: {
    type: "website",
    url: "https://github.com/nobruf/shadcn-landing-page.git",
    title: "Fantasy Premier League - Bảng Xếp Hạng",
    description: "Bảng xếp hạng Fantasy Premier League với thống kê điểm số theo League ID",
    images: [
      {
        url: "https://res.cloudinary.com/dbzv9xfjp/image/upload/v1723499276/og-images/shadcn-vue.jpg",
        width: 1200,
        height: 630,
        alt: "Shadcn - Landing template",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "https://github.com/nobruf/shadcn-landing-page.git",
    title: "Fantasy Premier League - Bảng Xếp Hạng",
    description: "Bảng xếp hạng Fantasy Premier League với thống kê điểm số theo League ID",
    images: [
      "https://res.cloudinary.com/dbzv9xfjp/image/upload/v1723499276/og-images/shadcn-vue.jpg",
    ],
  },
};

export default function Home() {
  return (
    <FantasyLeaderboard />
  );
}
