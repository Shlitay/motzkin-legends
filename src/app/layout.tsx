import type { Metadata } from "next";
import Analytics from "@/components/Analytics";
import { heebo, oswald } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prediction Legends",
  description: "ליגת הניחושים של החבר׳ה",
  applicationName: "Prediction Legends",
  openGraph: {
    title: "Prediction Legends",
    description: "נחשו. תפגעו בול. תהיו אגדה. 11 משחקים בכל מחזור, קופה אחת לזוכה.",
    siteName: "Prediction Legends",
    locale: "he_IL",
    type: "website",
  },
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
