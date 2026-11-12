import type { Metadata, Viewport } from "next";
import Analytics from "@/components/Analytics";
import { InstallCatcher } from "@/components/InstallPrompt";
import { heebo, oswald } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute base for the share image (opengraph-image.jpg) — WhatsApp and
  // friends need a full URL.
  metadataBase: new URL("https://prediction-legends.com"),
  title: "Prediction Legends",
  description: "ליגת הניחושים של החבר׳ה",
  applicationName: "Prediction Legends",
  openGraph: {
    title: "Prediction Legends — ליגת הניחושים של החבר׳ה",
    description: "נחשו. תפגעו בול. תהיו אגדה. 11 משחקים בכל מחזור, קופה אחת לזוכה.",
    siteName: "Prediction Legends",
    locale: "he_IL",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  // Home-screen app on iPhone (icon: apple-icon.png).
  appleWebApp: { capable: true, title: "Legends", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#123F24",
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
      <body>
        {children}
        <InstallCatcher />
      </body>
      <Analytics />
    </html>
  );
}
