"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Shield, ChevronDown,
  Github, Twitter, CheckCircle, X,
  ArrowUpFromLine, ArrowDownToLine, Layers, Send, Zap, Globe,
} from "lucide-react";

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center border-b border-border/30 glass">
      <div className="max-w-6xl mx-auto w-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-vault-500/15 border border-vault-500/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-vault-400" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-sm bg-btc-orange flex items-center justify-center">
              <span className="text-[7px] font-black text-black">₿</span>
            </div>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Obscura</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-base text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-vault-400 bg-vault-950/50 border border-vault-800/40 px-2.5 py-1 rounded-full font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-vault-400 live-dot" />
            Sepolia Testnet
          </div>
          <Link href="/app" className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-vault-500 hover:bg-vault-400 text-black text-base font-semibold transition-all hover:shadow-lg hover:shadow-vault-500/20">
            Launch App <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-vault-500/6 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-shield-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-btc-orange/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-vault-700/40 bg-vault-950/60 text-sm text-vault-400 mb-8 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-vault-400 animate-pulse" />
          Starknet Sepolia · Shielded Pool · Private Transfers
        </div>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
          Private strkBTC<br />
          <span className="gradient-text">Payments.</span><br />
          <span className="text-foreground/55 text-4xl sm:text-5xl lg:text-6xl">No trace. No link.</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
          Deposit strkBTC into a shielded pool. Transfer privately to any address with{" "}
          <strong className="text-foreground">zero on-chain trace</strong>. Withdraw whenever you want.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link href="/app" className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-vault-500 hover:bg-vault-400 text-black font-semibold text-lg transition-all hover:shadow-xl hover:shadow-vault-500/25">
            <Shield className="w-5 h-5" /> Launch Obscura
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-foreground font-medium text-lg transition-all">
            See how it works <ChevronDown className="w-5 h-5" />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {[
            { icon: <Globe className="w-4 h-4" />,          label: "Your Wallet",       cls: "text-muted-foreground border-border bg-secondary/60" },
            { icon: <ArrowDownToLine className="w-4 h-4" />, label: "Deposit",           cls: "text-vault-400 border-vault-700/50 bg-vault-950/60" },
            { icon: <Shield className="w-4 h-4" />,          label: "Shielded Pool",     cls: "text-shield-400 border-shield-700/50 bg-shield-950/60" },
            { icon: <Send className="w-4 h-4" />,            label: "Private Transfer",  cls: "text-blue-400 border-blue-700/50 bg-blue-950/60" },
            { icon: <ArrowUpFromLine className="w-4 h-4" />, label: "Withdraw Anywhere", cls: "text-btc-orange/90 border-btc-orange/30 bg-btc-orange/5" },
          ].map((item, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border font-medium ${item.cls}`}>
                {item.icon}{item.label}
              </div>
              {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground/40 animate-bounce">
        <span className="text-xs font-mono">scroll</span>
        <ChevronDown className="w-4 h-4" />
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section className="py-16 border-y border-border/30">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { value: "0",        label: "On-chain links",    sub: "Deposit ↔ Transfer" },
          { value: "Private",  label: "Internal transfers", sub: "Zero events emitted" },
          { value: "8",        label: "BTC decimals",      sub: "Matching real Bitcoin" },
          { value: "Starknet", label: "L2 ZK Rollup",     sub: "Fast & cheap" },
        ].map(({ value, label, sub }) => (
          <div key={label}>
            <div className="font-display text-3xl font-bold text-vault-400 tabular">{value}</div>
            <div className="text-base font-medium text-foreground mt-1">{label}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", icon: <ArrowDownToLine className="w-5 h-5" />, title: "Deposit strkBTC",      color: "vault",  body: "Connect your Ready or Braavos wallet. Approve the pool to spend your strkBTC and deposit any amount. The deposit is public on-chain but fully unlinked from any future transfers." },
    { n: "02", icon: <Shield className="w-5 h-5" />,          title: "Funds enter the pool",  color: "shield", body: "Your strkBTC is now held inside the ShieldedPool contract. Your balance is tracked privately — no observer can link your shielded balance to future transfers without your address." },
    { n: "03", icon: <Send className="w-5 h-5" />,            title: "Transfer privately",    color: "btc",    body: "Send strkBTC to any other address inside the pool. This operation emits zero events — there is literally no on-chain record of the transfer happening." },
    { n: "04", icon: <ArrowUpFromLine className="w-5 h-5" />, title: "Withdraw anywhere",     color: "vault",  body: "Withdraw your shielded balance to any Starknet address — including a fresh wallet. Withdrawal is public but the origin of the funds is completely unlinkable." },
  ];

  const cls = {
    vault:  { icon: "bg-vault-950/60 border-vault-700/40 text-vault-400",   n: "text-vault-400" },
    shield: { icon: "bg-shield-950/60 border-shield-700/40 text-shield-400", n: "text-shield-400" },
    btc:    { icon: "bg-amber-950/30 border-amber-700/30 text-amber-400",    n: "text-amber-400" },
  } as const;

  return (
    <section id="how-it-works" className="py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-mono text-vault-400 uppercase tracking-widest mb-3">Protocol</p>
          <h2 className="font-display text-4xl font-bold">How Obscura works</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">Four steps. Simple to use, impossible to trace.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-10">
          {steps.map(s => {
            const c = cls[s.color as keyof typeof cls];
            return (
              <div key={s.n} className="p-6 rounded-2xl border border-border/50 bg-card hover:border-border transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${c.icon}`}>{s.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-mono text-xs font-bold ${c.n}`}>{s.n}</span>
                      <h3 className="font-display font-semibold text-lg">{s.title}</h3>
                    </div>
                    <p className="text-base text-muted-foreground leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/60 p-6">
          <h3 className="font-display font-semibold text-base mb-5">Privacy model comparison</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { title: "Regular transfer",     items: ["Sender visible on-chain", "Receiver visible", "Amount visible", "Permanent link"],           bad: [0, 1, 2, 3] },
              { title: "Obscura MVP",          items: ["Depositor address logged", "Shielded balance", "Private transfers", "No withdrawal link"],    bad: [0] },
              { title: "Obscura v2 (planned)", items: ["ZK proof — no address", "Shielded balance", "Private transfers", "Full privacy"],             bad: [] },
            ].map(({ title, items, bad }) => (
              <div key={title} className="p-4 rounded-xl bg-secondary/30 border border-border/40">
                <p className="font-display font-medium mb-3 text-base">{title}</p>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {bad.includes(i)
                        ? <X className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                        : <CheckCircle className="w-3.5 h-3.5 text-vault-400 flex-shrink-0" />}
                      <span className={bad.includes(i) ? "text-muted-foreground/60" : "text-muted-foreground"}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" className="py-24 scroll-mt-20 border-t border-border/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-sm font-mono text-vault-400 uppercase tracking-widest mb-3">About</p>
            <h2 className="font-display text-4xl font-bold leading-tight mb-6">
              Financial privacy is a<br /><span className="gradient-text">fundamental right.</span>
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed text-base">
              <p>Obscura was built because Bitcoin on Starknet deserves the same privacy guarantees as cash. Every on-chain transfer today is permanently public — traceable by employers, governments, and adversaries from a single address.</p>
              <p>We use a shielded pool model where internal transfers emit zero events. There is no on-chain record that a transfer even happened — only the sender and recipient know.</p>
              <p>This is an MVP. Our vision is a full ZK-proof system where even the contract cannot determine which shielded balance is being spent. Only that a valid proof exists.</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { icon: <Shield className="w-5 h-5 text-vault-400" />,         title: "Our Vision",  body: "A Starknet ecosystem where financial privacy is the default. Where anyone can transact confidentially without permission or surveillance." },
              { icon: <Zap className="w-5 h-5 text-shield-400" />,           title: "Our Mission", body: "Build open-source, auditable privacy infrastructure for strkBTC on Starknet. Start with a working shielded pool, iterate toward full ZK proofs." },
              { icon: <ArrowRight className="w-5 h-5 text-btc-orange" />,    title: "Our Tech",    body: "Cairo smart contracts on Starknet. Shielded pool with private internal transfers. Frontend connects directly to your browser wallet — no server, no custody." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-border/80 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-secondary/60 border border-border flex items-center justify-center flex-shrink-0">{icon}</div>
                <div>
                  <h3 className="font-display font-semibold text-base mb-1.5">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Tech Stack ────────────────────────────────────────────────────────────────
function TechStack() {
  return (
    <section className="py-14 border-t border-border/30">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-sm font-mono text-vault-400 uppercase tracking-widest mb-6 text-center">Built with</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            ["Starknet", "L2 ZK rollup"], ["Cairo", "Smart contracts"], ["Starkzap", "SDK"],
            ["ShieldedPool", "Privacy layer"], ["Ready / Braavos", "Wallets"], 
            ["OpenZeppelin", "ERC20 standard"],
            // ["starknet.js v9", "Client SDK"],
            ["Next.js 15", "React framework"],
          ].map(([name, desc]) => (
            <div key={name} className="px-4 py-2 rounded-lg border border-border/50 bg-secondary/30 flex items-center gap-2 text-sm hover:border-vault-700/40 hover:bg-vault-950/20 transition-all">
              <Layers className="w-3.5 h-3.5 text-vault-500/60" />
              <span className="font-medium text-foreground/80">{name}</span>
              <span className="text-muted-foreground/50">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: "How does the shielded pool work?", a: "You deposit strkBTC into the ShieldedPool contract. Your balance is tracked internally. When you transfer to another address inside the pool, no event is emitted — the transfer is completely invisible on-chain." },
    { q: "Is there a link between my deposit and withdrawal?", a: "The deposit is public — your address and amount are visible. However, internal transfers are completely private. Once funds have moved internally, the withdrawal destination is not linkable to the original depositor." },
    { q: "Are private transfers truly invisible?", a: "Yes. The private_transfer function in the contract explicitly does not emit any Starknet events. A blockchain observer will see no record of the transfer. The only trace is in contract storage, which requires knowing both addresses to query." },
    { q: "What is strkBTC?", a: "strkBTC is wrapped Bitcoin on Starknet — an ERC20 token representing Bitcoin value on Starknet's L2. In this testnet demo, we use a mock strkBTC that you can mint for free." },
    { q: "Does Obscura have a backend or server?", a: "No. Obscura is fully client-side. Your wallet connects directly to Starknet via RPC. There is no Obscura server, no database, and no custody of your funds at any time." },
    { q: "Is this production-ready?", a: "No. This is experimental testnet software. Contracts are unaudited. Do not use with real funds. v2 roadmap includes full ZK proofs via Garaga and a professional security audit." },
  ];

  return (
    <section id="faq" className="py-24 scroll-mt-20 border-t border-border/30">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-mono text-vault-400 uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="font-display text-4xl font-bold">Frequently asked questions</h2>
        </div>
        <div className="space-y-2">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-secondary/20 transition-colors">
                <span className="font-display font-medium text-base">{q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-base text-muted-foreground leading-relaxed border-t border-border/30 pt-4">{a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-24 border-t border-border/30">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="relative rounded-3xl border border-vault-700/30 bg-vault-950/30 p-12 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-vault-500/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative z-10">
            <p className="font-mono text-vault-400 text-sm uppercase tracking-widest mb-4">Get started</p>
            <h2 className="font-display text-4xl font-bold mb-4">Try Obscura on Sepolia</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base">
              Mint free testnet strkBTC, deposit to the shielded pool, and experience truly private transfers in under two minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/app" className="flex items-center gap-2 px-7 py-4 rounded-xl bg-vault-500 hover:bg-vault-400 text-black font-semibold text-lg transition-all hover:shadow-xl hover:shadow-vault-500/25">
                <Shield className="w-5 h-5" /> Open App
              </Link>
              <a href="https://starknet-faucet.vercel.app" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-7 py-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-foreground font-medium transition-all text-base">
                Get testnet ETH →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border/30 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-vault-500/15 border border-vault-500/30 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-vault-400" />
          </div>
          <span className="font-display font-semibold text-base text-foreground/70">Obscura</span>
          <span className="text-muted-foreground/40">·</span>
          <span>Experimental testnet software. Not audited.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Github className="w-4 h-4" />GitHub</a>
          <a href="#" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Twitter className="w-4 h-4" />Twitter</a>
          <Link href="/app" className="hover:text-vault-400 transition-colors">Launch App</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <About />
      <TechStack />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}