import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Live | Edgewood Baptist Church",
    template: "%s | Edgewood Baptist Church",
  },
  description: "Watch Edgewood Baptist Church services live online.",

  metadataBase: new URL("https://live.edgewoodbaptchurch.com"),

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Live | Edgewood Baptist Church",
    description: "Join us live for worship and preaching at Edgewood Baptist Church.",
    url: "https://live.edgewoodbaptchurch.com",
    siteName: "Edgewood Baptist Church",
    images: [
      {
        url: "/og-image.png", // add later
        width: 1200,
        height: 630,
        alt: "Edgewood Baptist Church Live Stream",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Live | Edgewood Baptist Church",
    description: "Watch Edgewood Baptist Church services live online.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
