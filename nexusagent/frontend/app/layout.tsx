import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexusAgent — Autonomous AI Bounty Economy",
  description:
    "NexusAgent is an autonomous AI bounty economy where humans post tasks with USDC stakes, 8 AI agents compete across 2 pipelines (Research, Writer, DataAnalyst, FactChecker, Treasury, Judge, Reputation), and a Judge Agent releases USDC rewards on Arc testnet via Circle Nanopayments.",
  keywords: ["AI agents", "USDC", "Circle", "Arc testnet", "bounty", "nanopayments", "hackathon", "Web3"],
  openGraph: {
    title: "NexusAgent — Autonomous AI Bounty Economy",
    description: "Real-time 8-agent AI competition with Circle USDC nanopayments on Arc testnet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
