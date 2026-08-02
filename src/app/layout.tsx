import type { Metadata } from "next";
import { oswald, workSans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motzkin Legends",
  description: "Private prediction game for friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oswald.variable} ${workSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
