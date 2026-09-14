// Root layout: supplies global metadata, font, and application-wide styles.
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Metadata used by the browser tab and search previews.
export const metadata: Metadata = {
  title: "EcoTrack Hub — Enterprise Carbon Management & Sustainability",
  description: "Understand your carbon footprint, monitor emissions, and take meaningful action toward a more sustainable business.",
};

// Every route renders inside this required Next.js root layout.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
