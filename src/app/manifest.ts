import type { MetadataRoute } from "next";

// Lets players add the game to their phone's home screen like an app
// (see InstallPrompt). Opens straight to the predictions page, without the
// browser bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prediction Legends",
    short_name: "Legends",
    description: "ליגת הניחושים של החבר׳ה",
    start_url: "/predictions",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "he",
    dir: "rtl",
    background_color: "#F7F5EC",
    theme_color: "#123F24",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
