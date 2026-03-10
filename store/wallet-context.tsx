"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { getStarknet } from "get-starknet-core";
import { RpcProvider, type AccountInterface } from "starknet";
import { CONTRACTS, RPC_URL, TOKEN_ABI, POOL_ABI, formatAmount, shortenAddress, toU256Calldata } from "@/lib/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectedWallet {
  address: string;
  shortAddress: string;
  walletType: "argent" | "braavos" | "unknown";
}

export interface Balances {
  tokenRaw: bigint;
  shieldedRaw: bigint;
  poolRaw: bigint;
  token: string;
  shielded: string;
  pool: string;
}

interface WalletContextValue {
  status: WalletStatus;
  wallet: ConnectedWallet | null;
  balances: Balances | null;
  isLoadingBalances: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  executeMint: (amount: bigint) => Promise<string>;
  executeDeposit: (amount: bigint) => Promise<string>;
  executeWithdraw: (amount: bigint) => Promise<string>;
  executePrivateTransfer: (recipient: string, amount: bigint) => Promise<string>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

// ── Raw RPC call — bypasses starknet.js Contract entirely ─────────────────────
// This is the most reliable way to call view functions on starknet.js v9
async function callContract(
  provider: RpcProvider,
  contractAddress: string,
  entrypoint: string,
  calldata: string[] = []
): Promise<bigint> {
  try {
    const result = await provider.callContract({
      contractAddress,
      entrypoint,
      calldata,
    });
    // result is string[] — first element is the low felt of u256
    if (!result || result.length === 0) return BigInt(0);
    return BigInt(result[0]);
  } catch (e) {
    console.warn(`callContract ${entrypoint} failed:`, e);
    return BigInt(0);
  }
}

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
      // Use raw RPC calls — no Contract wrapper, no starknet.js quirks
      const [tokenRaw, shieldedRaw, poolRaw] = await Promise.all([
        callContract(provider.current, CONTRACTS.token, "balance_of", [wallet.address]),
        callContract(provider.current, CONTRACTS.pool,  "get_shielded_balance", [wallet.address]),
        callContract(provider.current, CONTRACTS.pool,  "get_pool_balance", []),
      ]);

      setBalances({
        tokenRaw,
        shieldedRaw,
        poolRaw,
        token:    formatAmount(tokenRaw),
        shielded: formatAmount(shieldedRaw),
        pool:     formatAmount(poolRaw),
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
      if (!wallets.length) throw new Error("No Starknet wallet found. Install Argent X or Braavos.");

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

  // ── Contract calls ────────────────────────────────────────────────────────────

  const executeMint = useCallback(async (amount: bigint): Promise<string> => {
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
  }, [account, refreshBalances]);

  const executeDeposit = useCallback(async (amount: bigint): Promise<string> => {
    if (!account) throw new Error("Wallet not connected");
    const { transaction_hash } = await account.execute([
      {
        contractAddress: CONTRACTS.token,
        entrypoint: "approve",
        calldata: [CONTRACTS.pool, ...toU256Calldata(amount)],
      },
      {
        contractAddress: CONTRACTS.pool,
        entrypoint: "deposit",
        calldata: toU256Calldata(amount),
      },
    ]);
    await provider.current.waitForTransaction(transaction_hash);
    await refreshBalances();
    return transaction_hash;
  }, [account, refreshBalances]);

  const executeWithdraw = useCallback(async (amount: bigint): Promise<string> => {
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
  }, [account, refreshBalances]);

  const executePrivateTransfer = useCallback(async (recipient: string, amount: bigint): Promise<string> => {
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
  }, [account, refreshBalances]);

  return (
    <WalletContext.Provider value={{
      status, wallet, balances, isLoadingBalances, error,
      connect, disconnect, refreshBalances,
      executeMint, executeDeposit, executeWithdraw, executePrivateTransfer,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}