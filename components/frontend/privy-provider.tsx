"use client";

// WHY this file exists:
// Next.js layout.tsx must be a Server Component to export `metadata`.
// But PrivyProvider needs "use client" because it uses React hooks internally.
// Solution: wrap PrivyProvider in its own client component, import it into layout.
// This way layout.tsx stays a server component and keeps its metadata export.

import { PrivyProvider } from "@privy-io/react-auth";
import { WalletProvider } from "@/store/wallet-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["google", "email"],
        appearance: {
          theme: "dark",
          accentColor: "#10b981",
          showWalletLoginFirst: false,
        },
        // Privy v3 config — no createOnLogin here, that key moved
        // We handle wallet creation manually in our API route
      }}
    >
      <WalletProvider>
        {children}
      </WalletProvider>
    </PrivyProvider>
  );
}