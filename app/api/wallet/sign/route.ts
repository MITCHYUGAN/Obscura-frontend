// This API route signs a transaction hash using Privy's rawSign.
// It's called by StarkZap whenever a transaction needs to be signed.

// WHY: The private key lives in Privy's servers. To sign a transaction,
// we give Privy the hash that needs signing, and they return the signature.
// Our app never touches the private key.

// WHEN: Called automatically by StarkZap every time the user executes
// a transaction (deposit, withdraw, transfer, mint).

import { PrivyClient } from "@privy-io/node";
import { NextResponse } from "next/server";

const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, hash } = body;

    // walletId — Privy's internal ID for this user's wallet
    // hash — the transaction hash that needs to be signed

    if (!walletId || !hash) {
      return NextResponse.json({ error: "walletId and hash required" }, { status: 400 });
    }

    // Ask Privy to sign the hash using the wallet's private key
    // This is a "raw sign" — just sign this hash, no questions asked

    const result = await privy.wallets().rawSign(walletId, {
      params: { hash },
    });

    // Return the signature to StarkZap
    return NextResponse.json({ signature: result.signature });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Signing failed";
    console.error("Signing error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
