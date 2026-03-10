"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { useWallet } from "@/store/wallet-context";
import { TxStatusBanner, type TxState } from "@/components/frontend/tx-status";
import { parseAmount, isValidAmount } from "@/lib/contracts";

export function FaucetForm() {
  const { status, executeMint } = useWallet();
  const [amount, setAmount] = useState("1.00000000");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const isConnected = status === "connected";
  const isBusy = tx.status === "pending" || tx.status === "confirming";
  const canMint = isConnected && isValidAmount(amount) && !isBusy;

  const handleMint = async () => {
    if (!canMint) return;
    setTx({ status: "pending" });
    try {
      const hash = await executeMint(parseAmount(amount));
      setTx({ status: "success", hash });
      setAmount("1.00000000");
    } catch (err) {
      setTx({
        status: "error",
        error: err instanceof Error ? err.message : "Mint failed",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-base">Testnet Faucet</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mint mock strkBTC to your wallet for testing.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Amount
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="0.00000001"
            placeholder="1.00000000"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (tx.status !== "idle") setTx({ status: "idle" });
            }}
            disabled={!isConnected || isBusy}
            className="w-full h-11 px-3 pr-20 rounded-lg border border-border bg-input font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-40"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
            strkBTC
          </span>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2">
          {["0.1", "0.5", "1", "10"].map((v) => (
            <button
              key={v}
              onClick={() => {
                setAmount(v);
                if (tx.status !== "idle") setTx({ status: "idle" });
              }}
              disabled={!isConnected || isBusy}
              className="flex-1 py-1.5 text-xs rounded-lg bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <TxStatusBanner tx={tx} />

      <button
        onClick={handleMint}
        disabled={!canMint}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isBusy ? (
          <>
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {tx.status === "pending" ? "Signing..." : "Confirming..."}
          </>
        ) : (
          <>
            <Droplets className="w-4 h-4" />
            Mint strkBTC
          </>
        )}
      </button>
    </div>
  );
}