"use client";

import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getStarknet } from "get-starknet-core";
import { RpcProvider, type AccountInterface } from "starknet";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";
import {
  CONTRACTS, RPC_URL, formatAmount, shortenAddress, toU256Calldata,
} from "@/lib/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConnectionMethod = "browser_wallet" | "social";
export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

// Status messages shown to the user during social login flow
export type ConnectingStep =
  | "authenticating"
  | "creating_wallet"
  | "deploying_account"
  | "finalizing"
  | null;

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
  connectingStep: ConnectingStep;
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
  const [connectingStep, setConnectingStep] = useState<ConnectingStep>(null);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [isLoadingBalances, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We store TWO execution contexts:
  // - account: for browser wallet (starknet.js AccountInterface)
  // - starkZapWallet: for social login (StarkZap wallet with paymaster attached)
  // WHY two? Because StarkZap wallet has AVNU paymaster baked in.
  // If we extract just the account, it loses the paymaster config.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const starkZapWalletRef = useRef<any>(null);
  const browserAccountRef = useRef<AccountInterface | null>(null);
  const connectionMethodRef = useRef<ConnectionMethod | null>(null);

  const provider = useRef(new RpcProvider({ nodeUrl: RPC_URL }));
  const { login, logout, ready: privyReady, authenticated, user, getAccessToken } = usePrivy();

  // ── Execute helper ────────────────────────────────────────────────────────
  // Routes transactions to the right executor based on connection method.
  // Browser wallet → raw account.execute()
  // Social → StarkZap wallet.execute() which includes AVNU paymaster

  const executeTransaction = useCallback(async (
    calls: { contractAddress: string; entrypoint: string; calldata: string[] }[]
  ): Promise<string> => {
    const method = connectionMethodRef.current;

    if (method === "social" && starkZapWalletRef.current) {
      // StarkZap wallet.execute() automatically uses AVNU paymaster
      // because the SDK was initialized with paymaster config
      const tx = await starkZapWalletRef.current.execute(calls, {
        feeMode: "sponsored",
      });
      return tx.hash;
    }

    if (method === "browser_wallet" && browserAccountRef.current) {
      const { transaction_hash } = await browserAccountRef.current.execute(calls);
      return transaction_hash;
    }

    throw new Error("Wallet not connected");
  }, []);

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
    setConnectingStep(null);
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

      browserAccountRef.current = acc as AccountInterface;
      connectionMethodRef.current = "browser_wallet";

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
    setConnectingStep("authenticating");
    setError(null);
    try {
      await login();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Social login failed";
      setError(msg);
      setStatus("error");
      setConnectingStep(null);
    }
  }, [privyReady, login]);

  useEffect(() => {
    if (!privyReady || !authenticated || !user) return;
    if (status === "connected") return;

    const setupSocialWallet = async () => {
      try {
        setStatus("connecting");
        setConnectingStep("authenticating");

        const accessToken = await getAccessToken();

        // Step: create/get Privy wallet
        setConnectingStep("creating_wallet");

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
          wallet: { id: string; address: string; publicKey: string };
        };

        const serverUrl = `${window.location.origin}/api/wallet/sign`;

        // Step: deploying account
        setConnectingStep("deploying_account");

        // Initialize StarkZap WITH paymaster config
        // This is critical — the paymaster must be set on the SDK,
        // not just on the onboard call
        const sdk = new StarkZap({
          network: "sepolia",
          paymaster: {
            nodeUrl: "https://sepolia.paymaster.avnu.fi",
            headers: {
              "x-paymaster-api-key": process.env.NEXT_PUBLIC_AVNU_API_KEY!,
            },
          },
        });

        const onboard = await sdk.onboard({
          strategy: OnboardStrategy.Privy,
          accountPreset: accountPresets.argentXV050,
          privy: {
            resolve: async () => ({
              walletId: privyWallet.id,
              publicKey: privyWallet.publicKey,
              serverUrl,
            }),
          },
          feeMode: "sponsored",
          deploy: "if_needed",
        });

        // Step: finalizing
        setConnectingStep("finalizing");

        // Store the StarkZap wallet reference — NOT just the account.
        // We need the full wallet so execute() goes through AVNU paymaster.
        starkZapWalletRef.current = onboard.wallet;
        connectionMethodRef.current = "social";

        const address = onboard.wallet.address.toString();
        const loginMethod = user.google ? "google" : "email";

        setWallet({
          address,
          shortAddress: shortenAddress(address),
          walletType: loginMethod,
          connectionMethod: "social",
        });
        setStatus("connected");
        setConnectingStep(null);
      } catch (e) {
        console.error("Social wallet setup failed:", e);
        const msg = e instanceof Error ? e.message : "Social login failed";
        setError(msg);
        setStatus("error");
        setConnectingStep(null);
      }
    };

    setupSocialWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, privyReady]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (connectionMethodRef.current === "social") logout();
    starkZapWalletRef.current = null;
    browserAccountRef.current = null;
    connectionMethodRef.current = null;
    setWallet(null);
    setBalances(null);
    setStatus("disconnected");
    setConnectingStep(null);
    setError(null);
  }, [logout]);

  const resetStatus = useCallback(() => {
    setStatus("disconnected");
    setConnectingStep(null);
    setError(null);
  }, []);

  // ── Contract calls — all go through executeTransaction() ─────────────────
  // executeTransaction() automatically routes to the right executor

  const executeMint = useCallback(async (amount: bigint): Promise<string> => {
    const address = connectionMethodRef.current === "social"
      ? starkZapWalletRef.current?.address?.toString()
      : browserAccountRef.current?.address;
    if (!address) throw new Error("Wallet not connected");

    const hash = await executeTransaction([{
      contractAddress: CONTRACTS.token,
      entrypoint: "mint",
      calldata: [address, ...toU256Calldata(amount)],
    }]);
    await provider.current.waitForTransaction(hash);
    await refreshBalances();
    return hash;
  }, [executeTransaction, refreshBalances]);

  const executeDeposit = useCallback(async (amount: bigint): Promise<string> => {
    const hash = await executeTransaction([
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
    await provider.current.waitForTransaction(hash);
    await refreshBalances();
    return hash;
  }, [executeTransaction, refreshBalances]);

  const executeWithdraw = useCallback(async (amount: bigint): Promise<string> => {
    const hash = await executeTransaction([{
      contractAddress: CONTRACTS.pool,
      entrypoint: "withdraw",
      calldata: toU256Calldata(amount),
    }]);
    await provider.current.waitForTransaction(hash);
    await refreshBalances();
    return hash;
  }, [executeTransaction, refreshBalances]);

  const executePrivateTransfer = useCallback(async (recipient: string, amount: bigint): Promise<string> => {
    const hash = await executeTransaction([{
      contractAddress: CONTRACTS.pool,
      entrypoint: "private_transfer",
      calldata: [recipient, ...toU256Calldata(amount)],
    }]);
    await provider.current.waitForTransaction(hash);
    await refreshBalances();
    return hash;
  }, [executeTransaction, refreshBalances]);

  return (
    <WalletContext.Provider value={{
      status, connectingStep, wallet, balances, isLoadingBalances, error,
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