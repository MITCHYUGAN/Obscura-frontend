"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { getStarknet } from "get-starknet-core";
import { Contract, RpcProvider, type AccountInterface } from "starknet";
import { CONTRACTS, RPC_URL, TOKEN_ABI, POOL_ABI, formatAmount, shortenAddress, toU256Calldata } from "@/lib/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectedWallet {
  address: string;
  shortAddress: string;
  walletType: "argent" | "braavos" | "unknown";
}

export interface Balances {
  // Raw bigint values from chain
  tokenRaw: bigint; // wallet strkBTC balance
  shieldedRaw: bigint; // shielded balance inside pool
  poolRaw: bigint; // total pool balance (all users)
  // Formatted strings for display
  token: string;
  shielded: string;
  pool: string;
}

interface WalletContextValue {
  // State
  status: WalletStatus;
  wallet: ConnectedWallet | null;
  balances: Balances | null;
  isLoadingBalances: boolean;
  error: string | null;
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  // Contract calls
  executeMint: (amount: bigint) => Promise<string>;
  executeDeposit: (amount: bigint) => Promise<string>;
  executeWithdraw: (amount: bigint) => Promise<string>;
  executePrivateTransfer: (recipient: string, amount: bigint) => Promise<string>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [isLoadingBalances, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = useRef(new RpcProvider({ nodeUrl: RPC_URL }));

  // ── Balances ────────────────────────────────────────────────────────────────

  const refreshBalances = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      //   const tokenContract = new Contract(TOKEN_ABI, CONTRACTS.token, provider.current);
      //   const poolContract = new Contract(POOL_ABI, CONTRACTS.pool, provider.current);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenContract = new (Contract as any)(CONTRACTS.token, TOKEN_ABI, provider.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poolContract = new (Contract as any)(CONTRACTS.pool, POOL_ABI, provider.current);

      const [tokenRaw, shieldedRaw, poolRaw] = await Promise.all([
        tokenContract.balance_of(wallet.address).then(toSafeBigint),
        poolContract.get_shielded_balance(wallet.address).then(toSafeBigint),
        poolContract.get_pool_balance().then(toSafeBigint),
      ]);

      setBalances({
        tokenRaw,
        shieldedRaw,
        poolRaw,
        token: formatAmount(tokenRaw),
        shielded: formatAmount(shieldedRaw),
        pool: formatAmount(poolRaw),
      });
    } catch (e) {
      console.warn("Balance refresh failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (status === "connected") refreshBalances();
  }, [status, refreshBalances]);

  // ── Connect ─────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const sn = getStarknet();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wallets: any[] = await sn.getAvailableWallets();
      if (!wallets.length) {
        throw new Error("No Starknet wallet found. Install Argent X or Braavos.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chosen: any = wallets.find((w: any) => w.id?.includes("argent")) ?? wallets[0];
      await chosen.enable({ starknetVersion: "v5" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc: any = chosen.account;
      if (!acc) throw new Error("Wallet did not return an account.");

      const address: string = acc.address as string;
      const id: string = (chosen.id as string) ?? "";
      const walletType = id.includes("argent") ? "argent" : id.includes("braavos") ? "braavos" : "unknown";

      setAccount(acc as AccountInterface);
      setWallet({ address, shortAddress: shortenAddress(address), walletType });
      setStatus("connected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
      setStatus("error");
    }
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setWallet(null);
    setAccount(null);
    setBalances(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  // ── Contract calls ───────────────────────────────────────────────────────────

  // Mint mock strkBTC (testnet faucet)
  const executeMint = useCallback(
    async (amount: bigint): Promise<string> => {
      if (!account) throw new Error("Wallet not connected");
      const { transaction_hash } = await account.execute([
        {
          contractAddress: CONTRACTS.token,
          entrypoint: "mint",
          calldata: [account.address, ...toU256Calldata(amount)],
        },
      ]);
      await provider.current.waitForTransaction(transaction_hash);
      await refreshBalances();
      return transaction_hash;
    },
    [account, refreshBalances],
  );

  // Deposit: approve then deposit in one multicall
  const executeDeposit = useCallback(
    async (amount: bigint): Promise<string> => {
      if (!account) throw new Error("Wallet not connected");
      const { transaction_hash } = await account.execute([
        // Step 1: approve pool to spend tokens
        {
          contractAddress: CONTRACTS.token,
          entrypoint: "approve",
          calldata: [CONTRACTS.pool, ...toU256Calldata(amount)],
        },
        // Step 2: deposit into pool
        {
          contractAddress: CONTRACTS.pool,
          entrypoint: "deposit",
          calldata: toU256Calldata(amount),
        },
      ]);
      await provider.current.waitForTransaction(transaction_hash);
      await refreshBalances();
      return transaction_hash;
    },
    [account, refreshBalances],
  );

  // Withdraw from pool back to wallet
  const executeWithdraw = useCallback(
    async (amount: bigint): Promise<string> => {
      if (!account) throw new Error("Wallet not connected");
      const { transaction_hash } = await account.execute([
        {
          contractAddress: CONTRACTS.pool,
          entrypoint: "withdraw",
          calldata: toU256Calldata(amount),
        },
      ]);
      await provider.current.waitForTransaction(transaction_hash);
      await refreshBalances();
      return transaction_hash;
    },
    [account, refreshBalances],
  );

  // Private transfer inside the pool (no on-chain trace)
  const executePrivateTransfer = useCallback(
    async (recipient: string, amount: bigint): Promise<string> => {
      if (!account) throw new Error("Wallet not connected");
      const { transaction_hash } = await account.execute([
        {
          contractAddress: CONTRACTS.pool,
          entrypoint: "private_transfer",
          calldata: [recipient, ...toU256Calldata(amount)],
        },
      ]);
      await provider.current.waitForTransaction(transaction_hash);
      await refreshBalances();
      return transaction_hash;
    },
    [account, refreshBalances],
  );

  return (
    <WalletContext.Provider
      value={{
        status,
        wallet,
        balances,
        isLoadingBalances,
        error,
        connect,
        disconnect,
        refreshBalances,
        executeMint,
        executeDeposit,
        executeWithdraw,
        executePrivateTransfer,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

// ── Helper: safely convert starknet.js v9 u256 response to bigint ─────────────
// starknet.js v9 returns u256 as a single bigint directly
// but older responses may return { low, high } — handle both
function toSafeBigint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (typeof value === "object" && value !== null && "low" in value) {
    return BigInt((value as { low: bigint | string }).low);
  }
  return 0n;
}
