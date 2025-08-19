import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/theme-context";

export const metadata: Metadata = {
  title: "Uhm Landing Page",
  description: "Uhmm...! - A modern, secure chat app that connects people quickly and easily",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* <head>
        <Script
          src="https://www.googletagmanager.com/gtm.js?id=GTM-W8KL5Q5"
          strategy="afterInteractive"
        />
      </head> */}
      <body className="full-screen-preview" suppressHydrationWarning={true}>
        <ThemeProvider>
          {children}
        </ThemeProvider>

      </body>
    </html>
  );
}
