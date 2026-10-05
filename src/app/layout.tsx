import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const plexSans = localFont({
  src: [
    { path: "../assets/fonts/IBMPlexSans-Regular.woff", weight: "400" },
    { path: "../assets/fonts/IBMPlexSans-Medium.woff", weight: "500" },
    { path: "../assets/fonts/IBMPlexSans-SemiBold.woff", weight: "600" },
    { path: "../assets/fonts/IBMPlexSans-Bold.woff", weight: "700" },
  ],
  variable: "--font-plex-sans",
});

const plexMono = localFont({
  src: [
    { path: "../assets/fonts/IBMPlexMono-Regular.woff", weight: "400" },
    { path: "../assets/fonts/IBMPlexMono-Medium.woff", weight: "500" },
    { path: "../assets/fonts/IBMPlexMono-SemiBold.woff", weight: "600" },
  ],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "CATION İhale Sistemi",
  description: "İş kıyafeti ihaleleri için maliyet ve teklif sistemi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
