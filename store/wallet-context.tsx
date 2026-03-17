"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getStarknet } from "get-starknet-core";
import { RpcProvider, type AccountInterface } from "starknet";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";
import { CONTRACTS, RPC_URL, formatAmount, shortenAddress, toU256Calldata } from "@/lib/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConnectionMethod = "browser_wallet" | "social";
export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectedWallet {
  address: string;
  shortAddress: string;
  walletType: "ready" | "braavos" | "google" | "email" | "unknown";
  connectionMethod: ConnectionMethod;
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
  connectSocial: () => Promise<void>;
  disconnect: () => void;
  resetStatus: () => void;
  refreshBalances: () => Promise<void>;
  executeMint: (amount: bigint) => Promise<string>;
  executeDeposit: (amount: bigint) => Promise<string>;
  executeWithdraw: (amount: bigint) => Promise<string>;
  executePrivateTransfer: (recipient: string, amount: bigint) => Promise<string>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

// ── Raw RPC helper ────────────────────────────────────────────────────────────

async function callContract(
  provider: RpcProvider,
  contractAddress: string,
  entrypoint: string,
  calldata: string[] = []
): Promise<bigint> {
  try {
    const result = await provider.callContract({ contractAddress, entrypoint, calldata });
    if (!result || result.length === 0) return BigInt(0);
    return BigInt(result[0]);
  } catch (e) {
    console.warn(`callContract ${entrypoint} failed:`, e);
    return BigInt(0);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [isLoadingBalances, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = useRef(new RpcProvider({ nodeUrl: RPC_URL }));
  const { login, logout, ready: privyReady, authenticated, user, getAccessToken } = usePrivy();

  // ── Balances ──────────────────────────────────────────────────────────────

  const refreshBalances = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      const [tokenRaw, shieldedRaw, poolRaw] = await Promise.all([
        callContract(provider.current, CONTRACTS.token, "balance_of", [wallet.address]),
        callContract(provider.current, CONTRACTS.pool, "get_shielded_balance", [wallet.address]),
        callContract(provider.current, CONTRACTS.pool, "get_pool_balance", []),
      ]);
      setBalances({
        tokenRaw, shieldedRaw, poolRaw,
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

  // ── Method A: Browser Wallet ──────────────────────────────────────────────

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const sn = getStarknet();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wallets: any[] = await sn.getAvailableWallets();
      if (!wallets.length) throw new Error("No Starknet wallet found. Install Ready or Braavos.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chosen: any = wallets.find((w: any) => w.id?.includes("ready")) ?? wallets[0];
      await chosen.enable({ starknetVersion: "v5" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc: any = chosen.account;
      if (!acc) throw new Error("Wallet did not return an account.");
      const address: string = acc.address as string;
      const id: string = (chosen.id as string) ?? "";
      const walletType = id.includes("ready") ? "ready" : id.includes("braavos") ? "braavos" : "unknown";
      setAccount(acc as AccountInterface);
      setWallet({ address, shortAddress: shortenAddress(address), walletType, connectionMethod: "browser_wallet" });
      setStatus("connected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
      setStatus("error");
    }
  }, []);

  // ── Method B: Social Login ────────────────────────────────────────────────

  const connectSocial = useCallback(async () => {
    if (!privyReady) return;
    setStatus("connecting");
    setError(null);
    try {
      await login();
      // After login() resolves, the useEffect below takes over
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Social login failed";
      setError(msg);
      setStatus("error");
    }
  }, [privyReady, login]);

  // Watches for Privy authentication completing, then sets up the StarkZap wallet
  useEffect(() => {
    if (!privyReady || !authenticated || !user) return;
    if (status === "connected") return;

    const setupSocialWallet = async () => {
      try {
        setStatus("connecting");

        // Get Privy access token to authenticate our API call
        const accessToken = await getAccessToken();

        // Call our backend to create/get this user's Starknet wallet
        const walletRes = await fetch("/api/wallet/starknet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId: user.id }),
        });

        if (!walletRes.ok) {
          const err = await walletRes.json() as { error?: string };
          throw new Error(err.error ?? "Failed to get wallet");
        }

        const { wallet: privyWallet } = await walletRes.json() as {
          wallet: { id: string; address: string; publicKey: string }
        };

        // Initialize StarkZap
        const sdk = new StarkZap({ network: "sepolia" });

        // WHY window.location.origin:
        // StarkZap validates that serverUrl is a full absolute URL.
        // "/api/wallet/sign" is a relative path — it fails validation.
        // window.location.origin gives us "http://localhost:3000" in dev
        // and "https://your-app.vercel.app" in production automatically.
        const serverUrl = `${window.location.origin}/api/wallet/sign`;

        const onboard = await sdk.onboard({
          strategy: OnboardStrategy.Privy,
          accountPreset: accountPresets.argentXV050,
          privy: {
            resolve: async () => ({
              walletId: privyWallet.id,
              publicKey: privyWallet.publicKey,
              serverUrl, // ← full absolute URL, fixes the error
            }),
          },
          deploy: "if_needed",
        });

        // Extract starknet.js-compatible account from StarkZap wallet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const starkZapAccount = (onboard.wallet as any).account as AccountInterface;
        const address = onboard.wallet.address.toString();
        const loginMethod = user.google ? "google" : "email";

        setAccount(starkZapAccount);
        setWallet({
          address,
          shortAddress: shortenAddress(address),
          walletType: loginMethod,
          connectionMethod: "social",
        });
        setStatus("connected");
      } catch (e) {
        console.error("Social wallet setup failed:", e);
        const msg = e instanceof Error ? e.message : "Social login failed";
        setError(msg);
        setStatus("error");
      }
    };

    setupSocialWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, privyReady]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (wallet?.connectionMethod === "social") logout();
    setWallet(null);
    setAccount(null);
    setBalances(null);
    setStatus("disconnected");
    setError(null);
  }, [wallet, logout]);

  const resetStatus = useCallback(() => {
    setStatus("disconnected");
    setError(null);
  }, []);

  // ── Contract calls ────────────────────────────────────────────────────────

  const executeMint = useCallback(async (amount: bigint): Promise<string> => {
    if (!account) throw new Error("Wallet not connected");
    const { transaction_hash } = await account.execute([{
      contractAddress: CONTRACTS.token,
      entrypoint: "mint",
      calldata: [account.address, ...toU256Calldata(amount)],
    }]);
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
    const { transaction_hash } = await account.execute([{
      contractAddress: CONTRACTS.pool,
      entrypoint: "withdraw",
      calldata: toU256Calldata(amount),
    }]);
    await provider.current.waitForTransaction(transaction_hash);
    await refreshBalances();
    return transaction_hash;
  }, [account, refreshBalances]);

  const executePrivateTransfer = useCallback(async (recipient: string, amount: bigint): Promise<string> => {
    if (!account) throw new Error("Wallet not connected");
    const { transaction_hash } = await account.execute([{
      contractAddress: CONTRACTS.pool,
      entrypoint: "private_transfer",
      calldata: [recipient, ...toU256Calldata(amount)],
    }]);
    await provider.current.waitForTransaction(transaction_hash);
    await refreshBalances();
    return transaction_hash;
  }, [account, refreshBalances]);

  return (
    <WalletContext.Provider value={{
      status, wallet, balances, isLoadingBalances, error,
      connect, connectSocial, disconnect, resetStatus, refreshBalances,
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