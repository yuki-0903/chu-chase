import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chu-chase.vercel.app"),
  title: {
    default: "CHU CHASE",
    template: "%s | CHU CHASE"
  },
  description: "ブチューから逃げる、シュールで笑える2人用3Dブラウザゲーム。",
  applicationName: "CHU CHASE",
  keywords: ["CHU CHASE", "browser game", "3D game", "multiplayer game", "kiss chase"],
  authors: [{ name: "CHU CHASE" }],
  creator: "CHU CHASE",
  publisher: "CHU CHASE",
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "CHU CHASE",
    title: "CHU CHASE",
    description: "ブチューから逃げる、シュールで笑える2人用3Dブラウザゲーム。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "CHU CHASE"
      }
    ],
    locale: "ja_JP"
  },
  twitter: {
    card: "summary_large_image",
    title: "CHU CHASE",
    description: "ブチューから逃げる、シュールで笑える2人用3Dブラウザゲーム。",
    images: ["/og-image.png"]
  },
  appleWebApp: {
    capable: true,
    title: "CHU CHASE",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F0F0F3"
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
