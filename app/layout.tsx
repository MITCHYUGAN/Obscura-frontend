// We wrap the entire app with TWO providers:
// 1. PrivyProvider — enables Google/Email login anywhere in the app
// 2. WalletProvider — your existing wallet state

// Order matters: PrivyProvider goes OUTSIDE WalletProvider
// because WalletProvider will eventually read from Privy

import type { Metadata } from "next";
import { Syne, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/frontend/privy-provider";

const syne = Syne({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700", "800"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["300", "400", "500"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body", weight: ["300", "400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Obscura — Private strkBTC Payments on Starknet",
  description: "Deposit strkBTC and receive a shielded note. Withdraw to any address with no on-chain link.",
  icons: {
    icon: "/favicon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${jetbrains.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased font-body bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
