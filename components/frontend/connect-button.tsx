"use client";

import { Wifi, LogOut, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/store/wallet-context";
import { explorerAddress } from "@/lib/contracts";

export function ConnectButton() {
  const { status, wallet, connect, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "connected" && wallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs">
          <span className="font-mono text-foreground">{wallet.shortAddress}</span>
          <span className="text-muted-foreground/40">·</span>
          <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <a href={explorerAddress(wallet.address)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-3 h-3" />
          </a>
          <button onClick={disconnect} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Disconnect">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={status === "connecting"}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
    >
      {status === "connecting" ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5" />
          Connect Wallet
        </>
      )}
    </button>
  );
}
