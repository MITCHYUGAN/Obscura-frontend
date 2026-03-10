import type { Metadata } from "next";
import { Syne, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../store/wallet-context";

const syne = Syne({ subsets: ["latin"], variable: "--font-display", weight: ["400","500","600","700","800"], display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["300","400","500"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body", weight: ["300","400","500"], display: "swap" });

export const metadata: Metadata = {
  title: "ZapVault — Private strkBTC Payments on Starknet",
  description: "Deposit strkBTC and receive a shielded note. Withdraw to any address with no on-chain link.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${jetbrains.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased font-body bg-background text-foreground">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}