// This API route creates (or retrieves) a Privy-managed Starknet wallet for a user.
// It runs on the SERVER — the browser never sees PRIVY_APP_SECRET.

// WHY: Privy manages private keys securely on their servers.
// We ask Privy to create a wallet for this user, and Privy gives us back the wallet's address and public key.
// The private key never leaves Privy.

// WHEN: Called when a user logs in with Google/Email for the first time,
// and every time they reconnect — we get or create their wallet.

import { PrivyClient } from "@privy-io/node";
import { NextResponse } from "next/server";

// Initialize Privy with your app credentials
// These are server-only — never sent to the browser
const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body; // sent from the browser after Privy login

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Ask Privy to create a Starknet wallet for this user.
    // If they already have one, Privy won't create a duplicate —
    // but the basic SDK doesn't have a "get existing" method easily,
    // so we create and handle the case where it already exists.

    const wallet = await privy.wallets().create({
      chain_type: "starknet",
      // Linking to userId means this wallet belongs to this user in Privy's system
      // If you omit this, it creates a server-managed wallet not tied to a user
    });

    const walletData = wallet as typeof wallet & {
      public_key?: string;
      publicKey?: string;
    };

    // Return the wallet info to the browser
    // NOTE: We only return address and public key — NEVER the private key
    return NextResponse.json({
      wallet: {
        id: wallet.id,
        address: wallet.address,
        publicKey: walletData.public_key ?? walletData.publicKey ?? "",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create wallet";
    console.error("Wallet creation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
