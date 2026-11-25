import type { Metadata, Viewport } from "next";
import AdSense from "@/components/AdSense";
import Analytics from "@/components/Analytics";
import EzoicRouteAds from "@/components/Ezoic";
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
        {/* Ezoic (https://docs.ezoic.com/docs/ezoicads/integration/): the
            privacy (consent) scripts first and not delayed, then the
            header script. Page changes are handled in components/Ezoic.tsx.
            Plain tags, not next/script: its beforeInteractive scripts land
            after the other head tags, and Ezoic needs the consent ones first. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js" />
        <script async src="https://www.ezojs.com/ezoic/sa.min.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: "window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];",
          }}
        />
        <script async src="https://ezoicanalytics.com/analytics.js" />
      </head>
      <body>
        {children}
        <InstallCatcher />
        {/* Content pages only — see AdSense.tsx. The anchor ad itself is
            switched on in the AdSense dashboard. */}
        <AdSense />
        <EzoicRouteAds />
      </body>
      <Analytics />
    </html>
  );
}
