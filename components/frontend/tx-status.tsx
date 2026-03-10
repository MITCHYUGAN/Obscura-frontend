"use client";

import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { explorerTx } from "@/lib/contracts";

export type TxStatus = "idle" | "pending" | "confirming" | "success" | "error";

export interface TxState {
  status: TxStatus;
  hash?: string;
  error?: string;
}

export function TxStatusBanner({ tx }: { tx: TxState }) {
  if (tx.status === "idle") return null;

  return (
    <div
      className={[
        "rounded-lg border p-3 text-sm",
        tx.status === "pending" || tx.status === "confirming"
          ? "bg-secondary/40 border-border"
          : tx.status === "success"
            ? "bg-emerald-950/40 border-emerald-800/50"
            : "bg-red-950/40 border-red-800/50",
      ].join(" ")}
    >
      {(tx.status === "pending" || tx.status === "confirming") && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{tx.status === "pending" ? "Signing transaction..." : "Waiting for confirmation..."}</span>
        </div>
      )}

      {tx.status === "success" && (
        <div className="flex items-start gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Confirmed!</p>
            {tx.hash && (
              <a
                href={explorerTx(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-1 text-[11px] font-mono text-emerald-500 hover:text-emerald-300 transition-colors"
              >
                {tx.hash.slice(0, 22)}...
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {tx.status === "error" && (
        <div className="flex items-start gap-2 text-red-400">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed</p>
            {tx.error && <p className="mt-0.5 text-[11px] text-red-400/70">{tx.error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
