// Contract addresses and ABIs for Obscura
// All other files import from here — single source of truth

export const CONTRACTS = {
  pool: process.env.NEXT_PUBLIC_POOL_ADDRESS!,
  token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS!,
} as const;

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.zan.top/public/starknet-sepolia/rpc/v0_10";

// 8 decimals — matching real Bitcoin
export const TOKEN_DECIMALS = 8;

// ── ABIs (only the functions we actually call) ────────────────────────────────
export const TOKEN_ABI = [
  {
    name: "balance_of",
    type: "function",
    inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },

  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
      { name: "amount", type: "core::integer::u256" },
    ],
    outputs: [{ type: "core::bool" }],
    state_mutability: "external",
  },

  {
    name: "mint",
    type: "function",
    inputs: [
      { name: "recipient", type: "core::starknet::contract_address::ContractAddress" },
      { name: "amount", type: "core::integer::u256" },
    ],
    outputs: [],
    state_mutability: "external",
  },
] as const;

export const POOL_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [{ name: "amount", type: "core::integer::u256" }],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [{ name: "amount", type: "core::integer::u256" }],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "private_transfer",
    type: "function",
    inputs: [
      { name: "recipient", type: "core::starknet::contract_address::ContractAddress" },
      { name: "amount",    type: "core::integer::u256" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "get_shielded_balance",
    type: "function",
    inputs: [{ name: "user", type: "core::starknet::contract_address::ContractAddress" }],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
  {
    name: "get_pool_balance",
    type: "function",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
  {
    name: "get_token_address",
    type: "function",
    inputs: [],
    outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
    state_mutability: "view",
  },
] as const;

// ── u256 calldata helper ──────────────────────────────────────────────────────
// Starknet u256 is two felts: [low, high]
// For amounts that fit in u128, high is always "0"

export function toU256Calldata(amount: bigint): string[] {
  return [amount.toString(), "0"];
}

// ── Amount formatting (8 decimals = Bitcoin standard) ────────────────────────
const DECIMALS_FACTOR = BigInt(10 ** TOKEN_DECIMALS);

export function formatAmount(raw: bigint, displayDecimals = 8): string {
  const whole = raw / DECIMALS_FACTOR;
  const frac = (raw % DECIMALS_FACTOR)
    .toString()
    .padStart(TOKEN_DECIMALS, "0")
    .slice(0, displayDecimals);
  return `${whole}.${frac}`;
}

export function parseAmount(value: string): bigint {
  const [whole, frac = ""] = value.split(".");
  const padded = frac.padEnd(TOKEN_DECIMALS, "0").slice(0, TOKEN_DECIMALS);
  return (
    BigInt(whole || "0") * DECIMALS_FACTOR + BigInt(padded || "0")
  );
}

export function isValidAmount(value: string): boolean {
  return /^\d+(\.\d{0,8})?$/.test(value) && parseFloat(value) > 0;
}

export function isValidAddress(address: string): boolean {
  const cleaned = address.startsWith("0x") ? address.slice(2) : address;
  return /^[0-9a-fA-F]{1,64}$/.test(cleaned) && cleaned.length > 0;
}

export function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function explorerTx(hash: string): string {
  return `https://sepolia.voyager.online/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `https://sepolia.voyager.online/contract/${address}`;
}
