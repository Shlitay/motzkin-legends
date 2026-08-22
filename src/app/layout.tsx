import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { heebo, oswald } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motzkin Legends",
  description: "משחק ניחושים פרטי לחברים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${oswald.variable} ${heebo.variable}`}>
      <body>{children}</body>
      <GoogleAnalytics gaId="G-GX7JT1JLL4" />
    </html>
  );
}
