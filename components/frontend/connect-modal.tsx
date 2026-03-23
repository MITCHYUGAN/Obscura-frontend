"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Wallet, Mail, ChevronRight, Loader2, X } from "lucide-react";
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

// ── Step messages — only shown after Privy auth succeeds ──────────────────────

const STEP_MESSAGES: Record<string, { label: string; sub: string }> = {
  creating_wallet:   { label: "Creating wallet...",   sub: "Setting up your Starknet wallet" },
  deploying_account: { label: "Deploying account...", sub: "Publishing your account on Starknet" },
  finalizing:        { label: "Almost done...",       sub: "Finalizing connection" },
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
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clean up timer when flow finishes or moves forward
    if (status !== "connecting" || connectingStep !== null) {
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }
      return;
    }

    // Here: status="connecting", connectingStep=null, our modal is closed
    // This means Privy popup is either open OR was just cancelled.
    //
    // WHY 2 seconds works now:
    // - connectSocial() now sets connectingStep=null (not "authenticating")
    // - If Privy succeeds, setupSocialWallet runs and sets connectingStep
    //   to "creating_wallet" almost immediately
    // - If user cancels, connectingStep stays null indefinitely
    // - So 2 seconds stuck on null = definitely cancelled
    if (!open && !cancelTimerRef.current) {
      cancelTimerRef.current = setTimeout(() => {
        cancelTimerRef.current = null;
        resetStatus();
      }, 2000);
    }

    if (open && cancelTimerRef.current) {
      clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }

    return () => {
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
      }
    };
  }, [open, status, connectingStep, resetStatus]);

  const base = "flex items-center gap-2 px-4 py-2 rounded-lg text-base font-semibold transition-all";
  const styles = {
    primary: "bg-vault-500 hover:bg-vault-400 text-black",
    ghost: "border border-border bg-secondary/40 hover:bg-secondary text-foreground",
  };

  if (status === "connecting" && !open) {
    const step = connectingStep ? STEP_MESSAGES[connectingStep] : null;

    // No step = Privy popup is open, waiting for user
    if (!step) {
      return (
        <div className={`flex flex-col gap-1 ${className}`}>
          <div className={`${base} ${styles[variant]} opacity-80 cursor-not-allowed w-full justify-center`}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-semibold">Waiting for login...</span>
          </div>
          <button
            onClick={() => {
              if (cancelTimerRef.current) {
                clearTimeout(cancelTimerRef.current);
                cancelTimerRef.current = null;
              }
              resetStatus();
            }}
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      );
    }

    // Step is active = real progress after Privy auth succeeded
    return (
      <div className={`${base} ${styles[variant]} ${className} opacity-90 cursor-not-allowed flex-col items-start gap-0.5 py-3`}>
        <div className="flex items-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span className="text-sm font-semibold">{step.label}</span>
        </div>
        <span className="text-xs opacity-70 pl-6">{step.sub}</span>
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