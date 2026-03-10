"use client";

import { useState } from "react";
import { ArrowUpFromLine, Info } from "lucide-react";
import { useWallet } from "@/store/wallet-context";
import { TxStatusBanner, type TxState } from "@/components/frontend/tx-status";
import { parseAmount, isValidAmount, formatAmount } from "@/lib/contracts";

export function WithdrawForm() {
  const { status, balances, executeWithdraw } = useWallet();
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const isConnected = status === "connected";
  const isBusy = tx.status === "pending" || tx.status === "confirming";
  const maxAmt = balances?.shieldedRaw ?? BigInt(0);
  const parsed = isValidAmount(amount) ? parseAmount(amount) : BigInt(0);
  const canWithdraw = isConnected && parsed > BigInt(0) && parsed <= maxAmt && !isBusy;

  const setPercent = (pct: number) => {
    const v = (maxAmt * BigInt(pct)) / BigInt(100);
    setAmount(formatAmount(v));
    if (tx.status !== "idle") setTx({ status: "idle" });
  };

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    setTx({ status: "pending" });
    try {
      const hash = await executeWithdraw(parsed);
      setTx({ status: "success", hash });
      setAmount("");
    } catch (err) {
      setTx({
        status: "error",
        error: err instanceof Error ? err.message : "Withdraw failed",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-base">Withdraw</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Move strkBTC from the shielded pool back to your wallet.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-2 p-3 rounded-lg bg-purple-950/30 border border-purple-800/30 text-xs text-purple-400/80">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Withdrawal is <strong className="text-purple-300">public</strong> — the amount
          is visible on-chain. There is no on-chain link between your deposit and this withdrawal.
        </span>
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Amount
          </label>
          <span className="text-xs text-muted-foreground font-mono">
            Shielded:{" "}
            <span className="text-foreground">
              {balances?.shielded ?? "—"}
            </span>{" "}
            strkBTC
          </span>
        </div>

        <div className="relative">
          <input
            type="number"
            min="0"
            step="0.00000001"
            placeholder="0.00000000"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (tx.status !== "idle") setTx({ status: "idle" });
            }}
            disabled={!isConnected || isBusy}
            className="w-full h-11 px-3 pr-20 rounded-lg border border-border bg-input font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-40"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
            strkBTC
          </span>
        </div>

        {/* Percent buttons */}
        <div className="flex gap-2">
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              onClick={() => setPercent(p)}
              disabled={!isConnected || !maxAmt || isBusy}
              className="flex-1 py-1.5 text-xs rounded-lg bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              {p === 100 ? "MAX" : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      <TxStatusBanner tx={tx} />

      <button
        onClick={handleWithdraw}
        disabled={!canWithdraw}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isBusy ? (
          <>
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {tx.status === "pending" ? "Signing..." : "Confirming..."}
          </>
        ) : (
          <>
            <ArrowUpFromLine className="w-4 h-4" />
            Withdraw from Pool
          </>
        )}
      </button>
    </div>
  );
}