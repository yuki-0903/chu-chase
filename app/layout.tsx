import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "CHU CHASE",
  description: "A 3D browser game built with Next.js and Three.js."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja" className={spaceGrotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
