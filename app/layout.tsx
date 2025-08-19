import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPL VNTrip",
  description: "FPL VNTrip - A modern, secure chat app that connects people quickly and easily",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="full-screen-preview" suppressHydrationWarning={true}>
        {children}

      </body>
    </html>
  );
}
