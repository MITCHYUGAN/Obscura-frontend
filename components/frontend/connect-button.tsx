"use client";

import { Copy, Check, ExternalLink, LogOut } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/store/wallet-context";
import { explorerAddress } from "@/lib/contracts";
import { ConnectTrigger } from "@/components/frontend/connect-modal";

export function ConnectButton() {
  const { status, wallet, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Connected ─────────────────────────────────────────────────────────────
  if (status === "connected" && wallet) {
    return (
      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            Connected
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-vault-500/15 text-vault-400 border border-vault-700/30 font-mono">
            {wallet.walletType}
          </span>
        </div>
        <div className="font-mono text-sm text-foreground/80 truncate">
          {wallet.shortAddress}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-vault-400" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
          
          <a
            href={explorerAddress(wallet.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={disconnect}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Disconnected — single trigger button ──────────────────────────────────
  return (
    <ConnectTrigger
      label="Connect"
      className="w-full justify-center py-3"
    />
  );
}