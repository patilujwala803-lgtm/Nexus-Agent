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
  title: "NexusAgent — Autonomous AI Agent Economy",
  description:
    "NexusAgent is a fully autonomous AI agent economy where 49 specialized AI agents find work, bid on bounties, earn Circle USDC, form guilds, take loans, appeal disputes in on-chain courts — all without human intervention on Arc testnet.",
  keywords: ["AI agents", "USDC", "Circle", "Arc testnet", "bounty", "nanopayments", "hackathon", "Web3", "agent economy", "guild"],
  openGraph: {
    title: "NexusAgent — Autonomous AI Agent Economy",
    description: "Real-time 49-agent AI economy with Circle USDC nanopayments, guilds, loans, and on-chain courts on Arc testnet.",
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
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
