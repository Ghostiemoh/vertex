"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Globe, Users } from "lucide-react";

const values = [
  {
    icon: Zap,
    title: "Surgical Finality",
    desc: "Every payment settles on Solana — sub-second, immutable, and verifiable. No ambiguity, no chargebacks, no waiting.",
  },
  {
    icon: Shield,
    title: "Non-Repudiation",
    desc: "Wallet-signed contracts create an on-chain paper trail. Both parties know exactly what was agreed and when.",
  },
  {
    icon: Globe,
    title: "Borderless by Default",
    desc: "SOL, USDC, and USDT work the same whether your client is in Lagos, London, or Los Angeles.",
  },
  {
    icon: Users,
    title: "Built for Independents",
    desc: "Vertex is designed for solo operators and small agencies — not enterprise teams with dedicated finance departments.",
  },
];

const ease = [0.32, 0.72, 0, 1] as const;

export default function AboutPage() {
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="pt-32 pb-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6"
          >
            About Vertex
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-5xl lg:text-[6rem] font-black tracking-tighter text-white leading-[0.9] mb-8"
          >
            THE SURGICAL POINT
            <br />
            <span className="text-primary italic">OF FINALITY.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
          >
            Vertex is a professional payment infrastructure for freelancers and
            small agencies settling work on the Solana blockchain. We handle
            invoicing, agreement drafting, and direct payment links — so you
            can focus on the work itself.
          </motion.p>
        </section>

        {/* Mission */}
        <section className="pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease }}
              className="space-y-6"
            >
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
                The Mission
              </h2>
              <h3 className="text-4xl font-black tracking-tighter text-white leading-tight">
                Institutional-grade settlement.
                <br />
                <span className="text-white/40">Consumer-grade simplicity.</span>
              </h3>
              <p className="text-white/50 leading-relaxed">
                The freelance economy runs on trust. Yet most payment
                infrastructure for independent workers is either too slow, too
                expensive, or impossible to verify. Vertex closes that gap —
                bringing on-chain finality to everyday client work without
                requiring either party to understand the underlying blockchain.
              </p>
              <p className="text-white/50 leading-relaxed">
                Every invoice, contract, and payment link on Vertex is
                anchored to Solana — giving both freelancer and client a shared
                record they can point to if anything is ever disputed.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease }}
              className="precision-glass border border-white/5 rounded-[40px] p-12 space-y-8"
            >
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  Protocol
                </p>
                <p className="text-2xl font-black text-white tracking-tight">
                  Solana Mainnet
                </p>
              </div>
              <div className="h-px bg-white/5" />
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  Tokens Supported
                </p>
                <div className="flex gap-2">
                  {["SOL", "USDC", "USDT"].map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-black text-white"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-px bg-white/5" />
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  Platform Fee
                </p>
                <p className="text-2xl font-black text-primary tracking-tight">
                  0.5%{" "}
                  <span className="text-white/30 text-base font-medium">
                    per transaction
                  </span>
                </p>
              </div>
              <div className="h-px bg-white/5" />
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                  No subscription. No monthly fee.
                </p>
                <p className="text-white/50 text-sm">
                  You only pay when you get paid.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="pb-24">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-4"
          >
            Core Principles
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05, ease }}
            className="text-4xl font-black tracking-tighter text-white mb-16"
          >
            What Vertex stands for.
          </motion.h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                className="bezel-double precision-glass p-8 rounded-[32px] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:border-primary transition-all">
                  <v.icon className="w-5 h-5 text-primary group-hover:text-black transition-colors" />
                </div>
                <h4 className="text-lg font-black text-white tracking-tight mb-3">
                  {v.title}
                </h4>
                <p className="text-white/50 leading-relaxed text-sm">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Builder */}
        <section className="pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="precision-glass border border-white/5 rounded-[48px] p-16 text-center relative overflow-hidden"
          >
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[120px] rounded-full" />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">
                Built by
              </p>
              <h3 className="text-3xl font-black text-white tracking-tighter mb-2">
                Muhammad Auwal Abdulaziz
              </h3>
              <p className="text-primary font-black text-sm uppercase tracking-widest mb-6">
                @Ghostiemoh
              </p>
              <p className="text-white/40 max-w-xl mx-auto leading-relaxed text-sm mb-10">
                On-chain analyst and independent developer focused on Solana
                infrastructure and data systems. Vertex was built to solve the
                exact payment friction faced by freelancers working with
                blockchain-native clients.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/invoice" className="vertex-btn">
                  Start a Free Invoice
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="vertex-btn-outline">
                  Get in Touch
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
