import { Caveat, Heebo, Oswald } from "next/font/google";

export const caveat = Caveat({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-caveat",
});

export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
});

// Hebrew + Latin body/heading face — Work Sans (Latin-only) can't render
// Hebrew at all, so the whole UI would silently fall back to a mismatched
// system font without this.
export const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heebo",
});
