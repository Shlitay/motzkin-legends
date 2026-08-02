import { Caveat, Oswald, Work_Sans } from "next/font/google";

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

export const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-work-sans",
});
