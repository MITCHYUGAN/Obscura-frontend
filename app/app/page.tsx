"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, ArrowDownToLine, ArrowUpFromLine, Send, Droplets, ChevronLeft, AlertTriangle, Copy, Check, LogOut, ExternalLink, Wallet, RefreshCw } from "lucide-react";
import { useWallet } from "@/store/wallet-context";
import { ConnectButton } from "@/components/frontend/connect-button";
import { explorerAddress, explorerTx, isValidAddress, isValidAmount, parseAmount, formatAmount } from "@/lib/contracts";

import logo from "../../public/logo.png";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────
type TxStatus = "idle" | "pending" | "confirming" | "success" | "error";
interface TxState {
  status: TxStatus;
  hash?: string;
  error?: string;
}
type Tab = "deposit" | "withdraw" | "transfer" | "faucet";

function cn(...c: (string | undefined | false)[]) {
  return c.filter(Boolean).join(" ");
}

// ── Tx Banner ─────────────────────────────────────────────────────────────────
function TxBanner({ tx }: { tx: TxState }) {
  if (tx.status === "idle") return null;
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-sm",
        (tx.status === "pending" || tx.status === "confirming") && "bg-muted/30 border-border",
        tx.status === "success" && "bg-vault-950/40 border-vault-700/50",
        tx.status === "error" && "bg-red-950/40 border-red-800/50",
      )}
    >
      {(tx.status === "pending" || tx.status === "confirming") && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <span className="text-base">{tx.status === "pending" ? "Signing..." : "Confirming..."}</span>
        </div>
      )}
      {tx.status === "success" && (
        <div className="text-vault-400">
          <p className="font-medium text-base">✓ Confirmed!</p>
          {tx.hash && (
            <a href={explorerTx(tx.hash)} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-vault-500 hover:text-vault-300 transition-colors mt-1 flex items-center gap-1">
              {tx.hash.slice(0, 28)}... <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
      {tx.status === "error" && (
        <div className="text-red-400">
          <p className="font-medium text-base">Failed</p>
          {tx.error && <p className="text-xs text-red-400/70 mt-0.5">{tx.error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Connect Prompt ────────────────────────────────────────────────────────────
function ConnectPrompt() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-vault-950/40 border border-vault-700/30 flex items-center justify-center mx-auto mb-6">
        <Shield className="w-9 h-9 text-vault-500/50" />
      </div>
      <h3 className="font-display font-semibold text-2xl mb-3">Connect to get started</h3>
      <p className="text-lg text-muted-foreground mb-8">Use your browser wallet or sign in with Google</p>
      <div className="flex flex-col gap-3 items-center">
        <ConnectButton />
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "deposit", icon: <ArrowDownToLine className="w-5 h-5" />, label: "Deposit" },
  { id: "withdraw", icon: <ArrowUpFromLine className="w-5 h-5" />, label: "Withdraw" },
  { id: "transfer", icon: <Send className="w-5 h-5" />, label: "Private Transfer" },
];

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { status, wallet, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-border/50 bg-card flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border/40">
        <Link href="/">
          <Image src={logo} alt="Landscape picture" width={200} height={0} />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto flex flex-col">
        {/* Main actions */}
        <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest px-2 mb-3">Actions</p>
        {NAV.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-all",
              tab === id ? "bg-vault-500/10 text-vault-400 border border-vault-700/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <span className={tab === id ? "text-vault-400" : ""}>{icon}</span>
            {label}
          </button>
        ))}

        {/* Network pill */}
        <div className="pt-5">
          <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest px-2 mb-3">Network</p>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/40 text-sm">
            <div className="w-2 h-2 rounded-full bg-vault-400 live-dot flex-shrink-0" />
            <span className="text-muted-foreground">Starknet Sepolia</span>
          </div>
        </div>

        {/* Faucet */}
        <div className="pt-5 mt-auto">
          <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest px-2 mb-3">Testnet Tools</p>
          <button
            onClick={() => setTab("faucet")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-all",
              tab === "faucet" ? "bg-orange-500/10 text-orange-400 border border-orange-700/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <Droplets className={cn("w-5 h-5", tab === "faucet" ? "text-orange-400" : "")} />
            Mint strkBTC
          </button>
        </div>
      </nav>

      {/* ── Wallet section — NOW uses ConnectButton ── */}
      <div className="p-3 border-t border-border/40">
        {status === "connected" && wallet ? (
          // Connected: show address + actions
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Connected</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-vault-500/15 text-vault-400 border border-vault-700/30 font-mono">{wallet.walletType}</span>
            </div>
            <div className="font-mono text-sm text-foreground/80 truncate">{wallet.shortAddress}</div>
            <div className="flex items-center gap-1">
              <button onClick={copy} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-vault-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <a
                href={explorerAddress(wallet.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={disconnect} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-auto">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          // Not connected: show BOTH buttons via ConnectButton
          <ConnectButton />
        )}
        <Link href="/" className="flex items-center gap-1.5 mt-2 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/40">
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>
      </div>
    </aside>
  );
}

// ── Balance Cards ─────────────────────────────────────────────────────────────
function BalanceCards() {
  const { balances, isLoadingBalances, refreshBalances } = useWallet();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">Balances</p>
        <button
          onClick={refreshBalances}
          disabled={isLoadingBalances}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          title="Refresh balances"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoadingBalances && "animate-spin")} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Wallet Balance", value: balances?.token ?? "—", unit: "strkBTC", icon: <Wallet className="w-4 h-4" />, color: "text-orange-400" },
          { label: "Shielded Balance", value: balances?.shielded ?? "—", unit: "strkBTC", icon: <Shield className="w-4 h-4" />, color: "text-vault-400" },
          { label: "Total Pool", value: balances?.pool ?? "—", unit: "strkBTC", icon: <ArrowDownToLine className="w-4 h-4" />, color: "text-purple-400" },
        ].map(({ label, value, unit, icon, color }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-mono">{label}</p>
              <span className={color}>{icon}</span>
            </div>
            <p className={cn("font-mono font-bold text-2xl tabular text-foreground", isLoadingBalances && "opacity-40")}>{isLoadingBalances ? "···" : value}</p>
            <p className="text-sm text-muted-foreground/60 mt-0.5">{unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Amount Input ──────────────────────────────────────────────────────────────
function AmountInput({ value, onChange, maxRaw, shieldedLabel, disabled }: { value: string; onChange: (v: string) => void; maxRaw: bigint; shieldedLabel: string; disabled?: boolean }) {
  const setPercent = (pct: number) => {
    const v = (maxRaw * BigInt(pct)) / BigInt(100);
    onChange(formatAmount(v));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Amount</label>
        <span className="text-sm text-muted-foreground font-mono">
          {shieldedLabel}: <span className="text-foreground">{maxRaw > BigInt(0) ? formatAmount(maxRaw) : "0.00000000"}</span> strkBTC
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.00000001"
          placeholder="0.00000000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-14 px-4 pr-24 rounded-xl border border-border bg-input font-mono text-xl text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-40"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">strkBTC</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            onClick={() => setPercent(p)}
            disabled={!maxRaw || disabled}
            className="py-2.5 text-sm rounded-lg bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 font-medium"
          >
            {p === 100 ? "MAX" : `${p}%`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Deposit Tab ───────────────────────────────────────────────────────────────
function DepositTab() {
  const { status, balances, executeDeposit } = useWallet();
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const isConnected = status === "connected";
  const maxAmt = balances?.tokenRaw ?? BigInt(0);
  const parsed = isValidAmount(amount) ? parseAmount(amount) : BigInt(0);
  const isBusy = tx.status === "pending" || tx.status === "confirming";
  const canDeposit = isConnected && parsed > BigInt(0) && parsed <= maxAmt && !isBusy;

  if (!isConnected) return <ConnectPrompt />;

  const handleDeposit = async () => {
    if (!canDeposit) return;
    setTx({ status: "pending" });
    try {
      const hash = await executeDeposit(parsed);
      setTx({ status: "success", hash });
      setAmount("");
    } catch (err) {
      setTx({ status: "error", error: err instanceof Error ? err.message : "Deposit failed" });
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-7 space-y-6">
      <div>
        <h3 className="font-display font-semibold text-xl">Deposit strkBTC</h3>
        <p className="text-base text-muted-foreground mt-1">Move strkBTC from your wallet into the shielded pool.</p>
      </div>
      <div className="flex gap-3 p-4 rounded-xl bg-vault-950/30 border border-vault-800/30 text-sm text-vault-400/80">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Depositing is <strong className="text-vault-300">public</strong> — the amount is visible on-chain. Once inside the pool, transfers are completely private.
        </span>
      </div>
      <AmountInput
        value={amount}
        onChange={(v) => {
          setAmount(v);
          if (tx.status !== "idle") setTx({ status: "idle" });
        }}
        maxRaw={maxAmt}
        shieldedLabel="Available"
        disabled={isBusy}
      />
      <TxBanner tx={tx} />
      <button
        onClick={handleDeposit}
        disabled={!canDeposit}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-vault-500 hover:bg-vault-400 text-black font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isBusy ? (
          <>
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {tx.status === "pending" ? "Signing..." : "Confirming..."}
          </>
        ) : (
          <>
            <ArrowDownToLine className="w-5 h-5" />
            Deposit to Shielded Pool
          </>
        )}
      </button>
    </div>
  );
}

// ── Withdraw Tab ──────────────────────────────────────────────────────────────
function WithdrawTab() {
  const { status, balances, executeWithdraw } = useWallet();
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const isConnected = status === "connected";
  const maxAmt = balances?.shieldedRaw ?? BigInt(0);
  const parsed = isValidAmount(amount) ? parseAmount(amount) : BigInt(0);
  const isBusy = tx.status === "pending" || tx.status === "confirming";
  const canWithdraw = isConnected && parsed > BigInt(0) && parsed <= maxAmt && !isBusy;

  if (!isConnected) return <ConnectPrompt />;

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    setTx({ status: "pending" });
    try {
      const hash = await executeWithdraw(parsed);
      setTx({ status: "success", hash });
      setAmount("");
    } catch (err) {
      setTx({ status: "error", error: err instanceof Error ? err.message : "Withdraw failed" });
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-7 space-y-6">
      <div>
        <h3 className="font-display font-semibold text-xl">Withdraw strkBTC</h3>
        <p className="text-base text-muted-foreground mt-1">Move strkBTC from the shielded pool back to your wallet.</p>
      </div>
      <div className="flex gap-3 p-4 rounded-xl bg-purple-950/30 border border-purple-800/30 text-sm text-purple-400/80">
        <ArrowUpFromLine className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Withdrawal is <strong className="text-purple-300">public</strong> — the amount is visible. There is no on-chain link between your deposit and this withdrawal.
        </span>
      </div>
      <AmountInput
        value={amount}
        onChange={(v) => {
          setAmount(v);
          if (tx.status !== "idle") setTx({ status: "idle" });
        }}
        maxRaw={maxAmt}
        shieldedLabel="Shielded"
        disabled={isBusy}
      />
      <TxBanner tx={tx} />
      <button
        onClick={handleWithdraw}
        disabled={!canWithdraw}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isBusy ? (
          <>
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {tx.status === "pending" ? "Signing..." : "Confirming..."}
          </>
        ) : (
          <>
            <ArrowUpFromLine className="w-5 h-5" />
            Withdraw from Pool
          </>
        )}
      </button>
    </div>
  );
}

// ── Transfer Tab ──────────────────────────────────────────────────────────────
function TransferTab() {
  const { status, balances, executePrivateTransfer } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const isConnected = status === "connected";
  const maxAmt = balances?.shieldedRaw ?? BigInt(0);
  const parsed = isValidAmount(amount) ? parseAmount(amount) : BigInt(0);
  const recipientValid = isValidAddress(recipient);
  const isBusy = tx.status === "pending" || tx.status === "confirming";
  const canTransfer = isConnected && recipientValid && parsed > BigInt(0) && parsed <= maxAmt && !isBusy;

  if (!isConnected) return <ConnectPrompt />;

  const handleTransfer = async () => {
    if (!canTransfer) return;
    setTx({ status: "pending" });
    try {
      const hash = await executePrivateTransfer(recipient, parsed);
      setTx({ status: "success", hash });
      setAmount("");
      setRecipient("");
    } catch (err) {
      setTx({ status: "error", error: err instanceof Error ? err.message : "Transfer failed" });
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-7 space-y-6">
      <div>
        <h3 className="font-display font-semibold text-xl">Private Transfer</h3>
        <p className="text-base text-muted-foreground mt-1">Send strkBTC to any address inside the pool. Zero on-chain trace.</p>
      </div>
      <div className="flex gap-3 p-4 rounded-xl bg-vault-950/30 border border-vault-800/30 text-sm text-vault-400/80">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          This transfer emits <strong className="text-vault-300">zero events</strong>. There is no on-chain record that this transfer happened at all.
        </span>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Recipient Address</label>
        <input
          type="text"
          placeholder="0x04d6c4..."
          value={recipient}
          onChange={(e) => {
            setRecipient(e.target.value);
            if (tx.status !== "idle") setTx({ status: "idle" });
          }}
          disabled={isBusy}
          className="w-full h-14 px-4 rounded-xl border border-border bg-input font-mono text-base text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-40"
        />
        {recipient && !recipientValid && <p className="text-sm text-red-400">Invalid Starknet address</p>}
      </div>
      <AmountInput
        value={amount}
        onChange={(v) => {
          setAmount(v);
          if (tx.status !== "idle") setTx({ status: "idle" });
        }}
        maxRaw={maxAmt}
        shieldedLabel="Shielded"
        disabled={isBusy}
      />
      <TxBanner tx={tx} />
      <button
        onClick={handleTransfer}
        disabled={!canTransfer}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-vault-500 hover:bg-vault-400 text-black font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isBusy ? (
          <>
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {tx.status === "pending" ? "Signing..." : "Confirming..."}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send Privately
          </>
        )}
      </button>
    </div>
  );
}

// ── Faucet Tab ────────────────────────────────────────────────────────────────
function FaucetTab() {
  const { status, executeMint, refreshBalances } = useWallet();
  const [amount, setAmount] = useState("1.00000000");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const isConnected = status === "connected";
  const isBusy = tx.status === "pending" || tx.status === "confirming";
  const canMint = isConnected && isValidAmount(amount) && !isBusy;

  if (!isConnected) return <ConnectPrompt />;

  const handleMint = async () => {
    if (!canMint) return;
    setTx({ status: "pending" });
    try {
      const hash = await executeMint(parseAmount(amount));
      setTx({ status: "success", hash });
      setAmount("1.00000000");
      setTimeout(() => refreshBalances(), 2500);
    } catch (err) {
      setTx({ status: "error", error: err instanceof Error ? err.message : "Mint failed" });
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-7 space-y-6">
      <div>
        <h3 className="font-display font-semibold text-xl">Testnet Faucet</h3>
        <p className="text-base text-muted-foreground mt-1">Mint free mock strkBTC to your wallet for testing.</p>
      </div>
      <div className="flex gap-3 p-4 rounded-xl bg-orange-950/20 border border-orange-800/30 text-sm text-orange-400/80">
        <Droplets className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          This is a <strong className="text-orange-300">testnet faucet</strong>. Tokens have no real value. Use them to test deposits, withdrawals, and private transfers.
        </span>
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Amount to Mint</label>
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
            disabled={isBusy}
            className="w-full h-14 px-4 pr-24 rounded-xl border border-border bg-input font-mono text-xl text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-40"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">strkBTC</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["0.1", "0.5", "1", "10"].map((v) => (
            <button
              key={v}
              onClick={() => {
                setAmount(v);
                if (tx.status !== "idle") setTx({ status: "idle" });
              }}
              disabled={isBusy}
              className="py-2.5 text-sm rounded-lg bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 font-medium"
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <TxBanner tx={tx} />
      <button
        onClick={handleMint}
        disabled={!canMint}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isBusy ? (
          <>
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {tx.status === "pending" ? "Signing..." : "Confirming..."}
          </>
        ) : (
          <>
            <Droplets className="w-5 h-5" />
            Mint strkBTC
          </>
        )}
      </button>
    </div>
  );
}

// ── Header bar ────────────────────────────────────────────────────────────────
const TAB_INFO: Record<Tab, { title: string; sub: string }> = {
  deposit: { title: "Deposit strkBTC", sub: "Shield your funds into the privacy pool" },
  withdraw: { title: "Withdraw strkBTC", sub: "Move shielded funds back to your wallet" },
  transfer: { title: "Private Transfer", sub: "Send shielded funds with zero on-chain trace" },
  faucet: { title: "Testnet Faucet", sub: "Mint free mock strkBTC for testing" },
};

// ── App Page ──────────────────────────────────────────────────────────────────
export default function AppPage() {
  const [tab, setTab] = useState<Tab>("deposit");
  const { status, balances } = useWallet();
  const isConnected = status === "connected";
  const info = TAB_INFO[tab];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar tab={tab} setTab={setTab} />

      <main className="flex-1 ml-64 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 h-16 flex items-center justify-between px-8 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div>
            <h1 className="font-display font-bold text-2xl">{info.title}</h1>
            <p className="text-sm text-muted-foreground">{info.sub}</p>
          </div>
          {isConnected && balances && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-card text-base">
              <span className="text-muted-foreground font-mono text-sm">Balance</span>
              <span className="font-mono font-bold text-vault-400 tabular">{balances.token}</span>
              <span className="text-muted-foreground text-sm">strkBTC</span>
            </div>
          )}
        </div>

        {/* Testnet warning */}
        <div className="mx-8 mt-5 px-5 py-3 rounded-xl border border-amber-800/30 bg-amber-950/15 text-base text-amber-500/70 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <strong className="text-amber-500/90">Experimental testnet software.</strong> Do not use with real funds. Contracts are unaudited.
        </div>

        <div className="px-8 py-6 max-w-2xl">
          {isConnected && <BalanceCards />}
          {tab === "deposit" && <DepositTab />}
          {tab === "withdraw" && <WithdrawTab />}
          {tab === "transfer" && <TransferTab />}
          {tab === "faucet" && <FaucetTab />}
        </div>
      </main>
    </div>
  );
}
