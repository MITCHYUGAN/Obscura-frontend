"use client";

// This is the central brain of the app's wallet state.
// Every component that needs to know "is a wallet connected?" or
// "execute this transaction" goes through here.

// We now support TWO connection methods:
// Method A: Browser wallet (Ready / Braavos)
// Method B: Social login (Google / Email) via Privy + StarkZap

// Both methods produce the same result: an `account` that can sign txs.

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getStarknet } from "get-starknet-core";
import { RpcProvider, type AccountInterface } from "starknet";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";
import { CONTRACTS, RPC_URL, formatAmount, shortenAddress, toU256Calldata } from "@/lib/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

// How is the user connected?
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
  refreshBalances: () => Promise<void>;
  resetStatus: () => void;
  executeMint: (amount: bigint) => Promise<string>;
  executeDeposit: (amount: bigint) => Promise<string>;
  executeWithdraw: (amount: bigint) => Promise<string>;
  executePrivateTransfer: (recipient: string, amount: bigint) => Promise<string>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

// ── Raw RPC call — bypasses starknet.js Contract entirely ─────────────────────
// This is the most reliable way to call view functions on starknet.js v9
async function callContract(provider: RpcProvider, contractAddress: string, entrypoint: string, calldata: string[] = []): Promise<bigint> {
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

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [isLoadingBalances, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RPC provider — used for read-only balance calls
  const provider = useRef(new RpcProvider({ nodeUrl: RPC_URL }));

  // Privy hook — gives us login(), logout(), user, and getAccessToken()
  // This is how we trigger the Google login popup
  const { login, logout, ready: privyReady, authenticated, user, getAccessToken } = usePrivy();

  // ── Balance reading  ────────────────────────────────────────────────────────────────

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
  // ── Method A: Browser Wallet (Ready / Braavos) ─────

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

  // ── Method B: Social Login (Google / Email via Privy + StarkZap) ─────
  // HOW IT WORKS:
  // 1. We call privy.login() → Google OAuth popup appears
  // 2. User signs in with Google
  // 3. Privy tells us the user is authenticated (via useEffect watching `authenticated`)
  // 4. We call our API route to get/create their Starknet wallet
  // 5. StarkZap uses that wallet to sign transactions

  // WHY useEffect for step 3-5?
  // The Privy popup closes asynchronously. We can't just await login() and
  // immediately have user data. Instead, we watch the `authenticated` state
  // change, and THAT triggers the wallet setup.

  const connectSocial = useCallback(async () => {
    if (!privyReady) return;
    setStatus("connecting");
    setError(null);
    try {
      // This opens the Privy popup (Google / Email options)
      // The rest happens in the useEffect below when `authenticated` becomes true
      await login();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Social login failed";
      setError(msg);
      setStatus("error");
    }
  }, [privyReady, login]);

  // This runs whenever Privy's auth state changes.
  // When the user successfully logs in with Google, `authenticated` becomes true
  // and `user` has their info. That's our signal to set up their Starknet wallet.
  useEffect(() => {
    if (!privyReady) return;
    if (!authenticated || !user) return;
    // Only run this if we're in "connecting" state (i.e., came from connectSocial)
    // OR if the user was already logged in when the page loaded
    if (status === "connected") return; // already set up, skip

    const setupSocialWallet = async () => {
      try {
        setStatus("connecting");

        // Step 1: Get an access token from Privy
        // This proves to our API route that this is a real authenticated user
        const accessToken = await getAccessToken();

        // Step 2: Call our API route to create/get this user's Starknet wallet
        // Our API route calls Privy server-side to create the wallet
        const walletRes = await fetch("/api/wallet/starknet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          // We send the Privy user ID so the API can associate the wallet
          body: JSON.stringify({ userId: user.id }),
        });

        if (!walletRes.ok) {
          const err = await walletRes.json();
          throw new Error(err.error ?? "Failed to get wallet");
        }

        const { wallet: privyWallet } = await walletRes.json();

        // Step 3: Initialize StarkZap SDK on Sepolia
        const sdk = new StarkZap({ network: "sepolia" });

        // Step 4: Use StarkZap's Privy strategy to connect the wallet
        // This creates a StarkZap wallet that:
        // - Uses Privy's signing (calls /api/wallet/sign for every tx)
        // - Deploys the account on-chain if it doesn't exist yet
        // - Handles all the starknet.js complexity for us
        const onboard = await sdk.onboard({
          strategy: OnboardStrategy.Privy,
          accountPreset: accountPresets.argentXV050, // Argent account type
          privy: {
            resolve: async () => ({
              walletId: privyWallet.id,
              publicKey: privyWallet.publicKey,
              // This tells StarkZap where to send signing requests
              // It will POST { walletId, hash } to this URL
              serverUrl: "/api/wallet/sign",
            }),
          },
          deploy: "if_needed", // Deploy account on-chain if this is first time
        });

        // Step 5: Extract the account interface from StarkZap
        // StarkZap's wallet has an `account` property compatible with starknet.js
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const starkZapAccount = (onboard.wallet as any).account as AccountInterface;
        const address = onboard.wallet.address.toString();

        // Determine display name from Privy user
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

  // ── Disconnect ───────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    // If connected via social, also log out of Privy
    if (wallet?.connectionMethod === "social") {
      logout();
    }
    setWallet(null);
    setAccount(null);
    setBalances(null);
    setStatus("disconnected");
    setError(null);
  }, [wallet, logout]);

  // Resets a stuck "connecting" state back to disconnected
  // Called when user cancels the Privy popup
  const resetStatus = useCallback(() => {
    setStatus("disconnected");
    setError(null);
  }, []);

  // ── Contract calls ────────────────────────────────────────────────────────────

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

  const executeDeposit = useCallback(
    async (amount: bigint): Promise<string> => {
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
    },
    [account, refreshBalances],
  );

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
        connectSocial,
        disconnect,
        refreshBalances,
        executeMint,
        executeDeposit,
        executeWithdraw,
        executePrivateTransfer,
        resetStatus,
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
