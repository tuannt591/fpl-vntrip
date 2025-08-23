import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/layout/theme-provider";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  viewport: {
    width: "device-width",
    initialScale: 1,
    minimumScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background", inter.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />

          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
