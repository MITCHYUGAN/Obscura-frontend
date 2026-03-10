"use client";

import { Wallet, Shield, Globe, RefreshCw } from "lucide-react";
import { useWallet } from "@/store/wallet-context";

export function BalanceCards() {
  const { balances, isLoadingBalances, refreshBalances, status } = useWallet();

  if (status !== "connected") return null;

  const cards = [
    {
      label: "Wallet Balance",
      value: balances?.token ?? "—",
      unit: "strkBTC",
      icon: <Wallet className="w-4 h-4" />,
      iconBg: "bg-orange-500/10 border-orange-500/20 text-orange-400",
      hint: "Your public strkBTC balance",
    },
    {
      label: "Shielded Balance",
      value: balances?.shielded ?? "—",
      unit: "strkBTC",
      icon: <Shield className="w-4 h-4" />,
      iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      hint: "Your private balance inside the pool",
    },
    {
      label: "Total Pool",
      value: balances?.pool ?? "—",
      unit: "strkBTC",
      icon: <Globe className="w-4 h-4" />,
      iconBg: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      hint: "All funds currently shielded",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Balances
        </p>
        <button
          onClick={refreshBalances}
          disabled={isLoadingBalances}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Refresh balances"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingBalances ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ label, value, unit, icon, iconBg, hint }) => (
          <div
            key={label}
            className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
            title={hint}
          >
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconBg}`}>
              {icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground/60 font-mono uppercase tracking-widest">
                {label}
              </p>
              <p className="font-mono font-bold text-xl tabular-nums text-foreground mt-1">
                {isLoadingBalances ? (
                  <span className="text-muted-foreground/40">···</span>
                ) : (
                  value
                )}
              </p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">{unit}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}