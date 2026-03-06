import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { JsonLd } from "@/components/json-ld";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://fpl-vntrip.vercel.app"),
  title: {
    default: "FPL Vntrip - Bảng Xếp Hạng Fantasy Premier League",
    template: "%s | FPL Vntrip",
  },
  description:
    "Theo dõi bảng xếp hạng Fantasy Premier League của nhóm Vntrip. Cập nhật điểm số theo tuần, đội hình, thống kê chi tiết và dữ liệu trực tiếp.",
  keywords: [
    "Fantasy Premier League",
    "FPL",
    "FPL Vntrip",
    "bảng xếp hạng",
    "leaderboard",
    "bóng đá",
    "football",
    "Premier League",
    "ngoại hạng Anh",
    "fantasy football",
  ],
  authors: [{ name: "Nguyen Tuan" }],
  creator: "Nguyen Tuan",
  publisher: "Vntrip",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FPL Vntrip - Bảng Xếp Hạng Fantasy Premier League",
    description:
      "Theo dõi bảng xếp hạng Fantasy Premier League của nhóm Vntrip. Cập nhật điểm số, đội hình và thống kê chi tiết.",
    type: "website",
    locale: "vi_VN",
    siteName: "FPL Vntrip",
  },
  twitter: {
    card: "summary_large_image",
    title: "FPL Vntrip - Bảng Xếp Hạng Fantasy Premier League",
    description:
      "Theo dõi bảng xếp hạng Fantasy Premier League của nhóm Vntrip. Cập nhật điểm số, đội hình và thống kê chi tiết.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={cn("min-h-screen bg-background", inter.className)}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <JsonLd />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
