import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Channel3 search",
  description: "Search Channel3's catalog and click through to merchants.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
