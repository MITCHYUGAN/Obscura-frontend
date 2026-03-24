# Obscura — Private strkBTC Payments on Starknet

> Deposit Bitcoin. Transfer privately. Withdraw anywhere. No on-chain link.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network: Starknet Sepolia](https://img.shields.io/badge/Network-Starknet%20Sepolia-purple)](https://sepolia.voyager.online)
[![Cairo 2.16](https://img.shields.io/badge/Cairo-2.16.0-orange)](https://book.cairo-lang.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Built with StarkZap](https://img.shields.io/badge/Built%20with-StarkZap-teal)](https://starkzap.io)

---

## What is Obscura?

Obscura is a shielded payment pool for strkBTC (wrapped Bitcoin) on Starknet. Users deposit strkBTC into a smart contract pool, transfer privately between addresses with zero Transfer events emitted, and withdraw to any wallet — breaking the on-chain link between depositor and withdrawer.

**The core privacy property:** A deposit from Address A and a withdrawal to Address B share no on-chain record connecting them. No Transfer event. No indexed trace. No link.

---

## Live Contracts — Starknet Sepolia

| Contract | Address |
|---|---|
| MockERC20 (strkBTC) | `0x02b3bf9216449824c8731ac74722c3b691aad2c49ae628489cd03142934eb920` |
| ShieldedPool | `0x07ea10d54e14be50974a21d1f0849ae9eab3956e09aad6d72339b0ae29ad1589` |

- [View ShieldedPool on Voyager](https://sepolia.voyager.online/contract/0x07ea10d54e14be50974a21d1f0849ae9eab3956e09aad6d72339b0ae29ad1589)

---

## How It Works
```
Wallet A                ShieldedPool              Wallet B
   │                         │                        │
   │──── deposit(amount) ───▶│                        │
   │     [PUBLIC on-chain]   │                        │
   │                         │                        │
   │── private_transfer() ──▶│                        │
   │   [ZERO events emitted] │                        │
   │                         │                        │
   │                         │◀─── withdraw(amount) ──│
   │                         │     [PUBLIC on-chain]  │
```

1. **Deposit** — Move strkBTC from your wallet into the pool. This is public.
2. **Shield** — Your balance is tracked internally. No observer can link it to transfers.
3. **Private Transfer** — Send to any address in the pool. Zero events emitted. Zero indexed trace.
4. **Withdraw** — Pull funds to any wallet. Public amount, but no link to the original deposit.

---

## Privacy Model

| Property | Current (v1) | Planned (v2) |
|---|---|---|
| Transfer events | ✅ None emitted | ✅ None emitted |
| Token indexer visibility | ✅ Not indexed | ✅ Not indexed |
| Deposit-withdrawal link | ✅ Unlinked via two-wallet flow | ✅ Cryptographically broken |
| Sender address | ❌ Visible on-chain | ✅ Hidden via ZK proof |
| Recipient address | ❌ Visible in calldata | ✅ Hidden via ZK proof |
| Amount | ❌ Visible in calldata | ✅ Hidden via ZK proof |

**v2 roadmap:** ZK commitment-nullifier system using something like [Garaga](https://github.com/keep-starknet-strange/garaga) on Starknet. Deposit creates a cryptographic commitment. Withdrawal requires a ZK proof of knowledge — revealing nothing about which deposit it corresponds to.

---

## StarkZap Integration

Obscura uses [StarkZap](https://starkzap.io) for two features:

**Social Login (Wallets module)**
Users can sign in with Google or Email via Privy — no seed phrases, no wallet extension required. StarkZap's Privy strategy creates and manages a Starknet account for each user, with signing handled server-side through a Next.js API route.

**Gasless Transactions (Paymaster module)**
All transactions for social login users are sponsored by AVNU paymaster. Users pay zero gas fees — no STRK required. Deployment of new accounts is also fully sponsored.

Browser wallet users (Ready, Xverse, Braavos) connect directly via `get-starknet-core` and pay their own gas as normal.

---

## Contract Interface
```cairo
// Deposit strkBTC into the shielded pool (requires prior approve)
fn deposit(ref self, amount: u256)

// Withdraw from shielded balance back to wallet
fn withdraw(ref self, amount: u256)

// Private transfer — ZERO events emitted
fn private_transfer(ref self, recipient: ContractAddress, amount: u256)

// Batch private transfer to multiple recipients — ZERO events emitted
fn batch_transfer(ref self, recipients: Array<ContractAddress>, amounts: Array<u256>)

// View functions
fn get_shielded_balance(self, user: ContractAddress) -> u256
fn get_pool_balance(self) -> u256
fn get_token_address(self) -> ContractAddress
```

---

## Project Structure
```
Obscura/
├── obscura-contract/          # Cairo smart contracts
│   ├── src/
│   │   └── lib.cairo          # ShieldedPool + MockERC20
│   ├── tests/
│   │   └── test_pool.cairo    # 6/6 tests passing
│   └── Scarb.toml
│
└── obscura-ui/                # Next.js 15 frontend
    ├── app/
    │   ├── page.tsx           # Landing page
    │   ├── app/page.tsx       # Main dapp
    │   └── api/
    │       └── wallet/        # Privy signing backend
    ├── store/
    │   └── wallet-context.tsx # Wallet + contract state
    ├── lib/
    │   └── contracts.ts       # ABIs, addresses, helpers
    └── components/
        └── frontend/          # Connect modal, wallet UI
```

---

## Getting Started

### Prerequisites

- [Scarb](https://docs.swmansion.com/scarb/) 2.16.0
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) 0.57.0
- Node.js 18+
- Ready, Xverse, or Braavos browser wallet (optional — social login works without one)

### Run the frontend
```bash
cd obscura-ui
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Run contract tests
```bash
cd obscura-contract
snforge test
```

All 6 tests pass:
```
test_deposit ✅
test_withdraw ✅
test_private_transfer ✅
test_batch_transfer ✅
test_overdraft_protection ✅
test_approval_guard ✅
```

### Environment variables
```env
# Contract addresses
NEXT_PUBLIC_POOL_ADDRESS=0x07ea10d54e14be50974a21d1f0849ae9eab3956e09aad6d72339b0ae29ad1589
NEXT_PUBLIC_TOKEN_ADDRESS=0x02b3bf9216449824c8731ac74722c3b691aad2c49ae628489cd03142934eb920
NEXT_PUBLIC_RPC_URL=https://api.zan.top/public/starknet-sepolia/rpc/v0_10

# Privy — social login (https://privy.io)
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# AVNU Paymaster — gasless transactions (https://portal.avnu.fi)
NEXT_PUBLIC_AVNU_API_KEY=your-avnu-api-key
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Cairo 2.16, Starknet |
| Token standard | OpenZeppelin ERC20 for Cairo |
| Testing | Starknet Foundry (snforge) |
| Frontend | Next.js 15, TypeScript, Tailwind v4 |
| Wallet SDK | StarkZap v1 |
| Social login | Privy (via StarkZap) |
| Gasless transactions | AVNU Paymaster (via StarkZap) |
| Browser wallets | get-starknet-core, starknet.js v9 |
| Wallets supported | Ready, Xverse, Braavos, Google, Email |
| Network | Starknet Sepolia |

---

## Two-Wallet Privacy Flow

For maximum privacy using v1:

1. **Wallet A** mints and deposits strkBTC into the pool
2. **Wallet A** does a private transfer to **Wallet B** (a fresh address with no history)
3. **Wallet B** withdraws

On-chain result: Wallet A deposited. Wallet B withdrew. No transaction, event, or record connects them.

Social login users can create a second account with a different email to achieve this flow entirely without a browser wallet.

---

## Roadmap

**v1 (current)**
- [x] Shielded pool Cairo smart contract
- [x] Zero-event private transfers
- [x] Batch transfers
- [x] Full frontend with connect modal
- [x] Browser wallet support (Ready, Xverse, Braavos)
- [x] Social login via StarkZap + Privy (Google, Email)
- [x] Gasless transactions via StarkZap + AVNU paymaster
- [x] Live on Starknet Sepolia

**v2 (post-hackathon)**
- [ ] ZK commitment tree (Pedersen hash)
- [ ] Nullifier set to prevent double-spend
- [ ] Garaga ZK proof verification in Cairo
- [ ] Client-side proof generation in browser
- [ ] Fixed denomination deposits (Tornado Cash model)
- [ ] Relayer support for gas-free withdrawals
- [ ] Mainnet deployment

---

## License

MIT — see [LICENSE](./LICENSE)