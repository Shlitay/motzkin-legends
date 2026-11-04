import type { Metadata } from "next";
import Analytics from "@/components/Analytics";
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
      <head>
        {/* AdSense. Plain script tag rather than next/script so it is in the
            server-rendered HTML, where Google's site check looks for it. The
            anchor ad itself is switched on in the AdSense dashboard. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5971476129281770"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
      <Analytics />
    </html>
  );
}
