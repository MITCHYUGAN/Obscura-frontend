"use client";

import { useState, useEffect } from "react";
import { Shield, Wallet, Mail, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWallet } from "@/store/wallet-context";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const { connect, connectSocial, status } = useWallet();
  const [hovering, setHovering] = useState<"wallet" | "social" | null>(null);
  const isBusy = status === "connecting";

  const handleWallet = async () => {
    onClose();
    await connect();
  };

  const handleSocial = async () => {
    onClose();
    await connectSocial();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-card border border-border/60 shadow-2xl shadow-black/40 p-0 overflow-hidden">

        <DialogHeader className="px-7 pt-7 pb-5 border-b border-border/40">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-vault-500/15 border border-vault-500/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-vault-400" />
            </div>
            <DialogTitle className="font-display font-bold text-2xl">
              Connect to Obscura
            </DialogTitle>
          </div>
          <p className="text-base text-muted-foreground">
            Choose how you want to connect. No seed phrases required for social login.
          </p>
        </DialogHeader>

        <div className="p-5 space-y-3">
          <button
            onClick={handleWallet}
            disabled={isBusy}
            onMouseEnter={() => setHovering("wallet")}
            onMouseLeave={() => setHovering(null)}
            className="w-full flex items-center gap-4 p-5 rounded-xl border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-border/50 bg-secondary/30 hover:bg-vault-950/40 hover:border-vault-700/50 group"
          >
            <div className="w-12 h-12 rounded-xl bg-vault-500/10 border border-vault-700/30 flex items-center justify-center flex-shrink-0 group-hover:bg-vault-500/20 transition-colors">
              <Wallet className="w-6 h-6 text-vault-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display font-semibold text-lg text-foreground">Browser Wallet</p>
              <p className="text-sm text-muted-foreground mt-0.5">Ready, Braavos, or any Starknet wallet</p>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-150 ${hovering === "wallet" ? "translate-x-0.5 text-vault-400" : ""}`} />
          </button>

          <div className="flex items-center gap-3 px-1">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-sm text-muted-foreground/50 font-mono">or</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          <button
            onClick={handleSocial}
            disabled={isBusy}
            onMouseEnter={() => setHovering("social")}
            onMouseLeave={() => setHovering(null)}
            className="w-full flex items-center gap-4 p-5 rounded-xl border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-border/50 bg-secondary/30 hover:bg-vault-950/40 hover:border-vault-700/50 group"
          >
            <div className="w-12 h-12 rounded-xl bg-vault-500/10 border border-vault-700/30 flex items-center justify-center flex-shrink-0 group-hover:bg-vault-500/20 transition-colors">
              <Mail className="w-6 h-6 text-vault-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display font-semibold text-lg text-foreground">Social Login</p>
              <p className="text-sm text-muted-foreground mt-0.5">Google or Email — no wallet or seed phrase needed</p>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-150 ${hovering === "social" ? "translate-x-0.5 text-vault-400" : ""}`} />
          </button>
        </div>

        <div className="px-7 pb-6 pt-1">
          <p className="text-xs text-muted-foreground/40 text-center font-mono">
            Starknet Sepolia · Non-custodial · Testnet only
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Step messages shown during social login ───────────────────────────────────

const STEP_MESSAGES: Record<string, { label: string; sub: string }> = {
  authenticating:   { label: "Authenticating...",         sub: "Verifying your account" },
  creating_wallet:  { label: "Creating wallet...",        sub: "Setting up your Starknet wallet" },
  deploying_account:{ label: "Deploying account...",      sub: "Publishing your account on Starknet" },
  finalizing:       { label: "Almost done...",            sub: "Finalizing connection" },
};

// ── ConnectTrigger ────────────────────────────────────────────────────────────

interface ConnectTriggerProps {
  label?: string;
  className?: string;
  variant?: "primary" | "ghost";
}

export function ConnectTrigger({
  label = "Connect",
  className = "",
  variant = "primary",
}: ConnectTriggerProps) {
  const [open, setOpen] = useState(false);
  const { status, connectingStep, resetStatus } = useWallet();

  // If modal is closed and we're stuck connecting, user cancelled Privy
  useEffect(() => {
    if (open) return;
    if (status !== "connecting") return;
    // Only reset if there's no active step (means Privy popup was cancelled)
    if (connectingStep) return;
    const timer = setTimeout(() => resetStatus(), 300);
    return () => clearTimeout(timer);
  }, [open, status, connectingStep, resetStatus]);

  const base = "flex items-center gap-2 px-4 py-2 rounded-lg text-base font-semibold transition-all";
  const styles = {
    primary: "bg-vault-500 hover:bg-vault-400 text-black",
    ghost: "border border-border bg-secondary/40 hover:bg-secondary text-foreground",
  };

  // Show step-by-step progress during social login
  if (status === "connecting" && !open) {
    const step = connectingStep ? STEP_MESSAGES[connectingStep] : null;
    return (
      <div className={`${base} ${styles[variant]} ${className} opacity-90 cursor-not-allowed flex-col items-start gap-0.5 py-3`}>
        <div className="flex items-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span className="text-sm font-semibold">
            {step?.label ?? "Connecting..."}
          </span>
        </div>
        {step?.sub && (
          <span className="text-xs opacity-70 pl-6">{step.sub}</span>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${base} ${styles[variant]} ${className}`}
      >
        <Shield className="w-4 h-4" />
        {label}
      </button>
      <ConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}