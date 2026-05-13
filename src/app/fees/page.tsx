"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

const ease = [0.32, 0.72, 0, 1] as const;

const feeRows = [
  { label: "Platform fee (all tokens)", value: "0.5%", note: "Deducted from each payment" },
  { label: "Subscription / monthly fee", value: "None", note: "Pay only when you get paid" },
  { label: "Invoice creation", value: "Free", note: "No limit on invoices" },
  { label: "Contract generation", value: "Free", note: "Wallet-signed PDFs included" },
  { label: "Payment link creation", value: "Free", note: "Unlimited payment links" },
  { label: "Client management", value: "Free", note: "Store unlimited billing contacts" },
  { label: "Solana network fee", value: "~$0.0005", note: "Paid by the sender's wallet" },
];

const comparisons = [
  { feature: "Crypto-native payments", vertex: true, traditional: false },
  { feature: "On-chain payment proof", vertex: true, traditional: false },
  { feature: "Wallet-signed contracts", vertex: true, traditional: false },
  { feature: "Sub-second settlement", vertex: true, traditional: false },
  { feature: "No chargeback risk", vertex: true, traditional: false },
  { feature: "Monthly subscription required", vertex: false, traditional: true },
  { feature: "% fee per transaction", vertex: true, traditional: true },
  { feature: "Withdrawal delay (2–5 days)", vertex: false, traditional: true },
];

const examples = [
  { invoice: "500 USDC", fee: "2.50 USDC", you: "497.50 USDC" },
  { invoice: "1,000 USDC", fee: "5.00 USDC", you: "995.00 USDC" },
  { invoice: "5 SOL", fee: "0.025 SOL", you: "4.975 SOL" },
  { invoice: "2,500 USDT", fee: "12.50 USDT", you: "2,487.50 USDT" },
];

export default function FeesPage() {
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="pt-32 pb-24">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6"
          >
            Pricing & Fees
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-5xl lg:text-[6rem] font-black tracking-tighter text-white leading-[0.9] mb-8"
          >
            SIMPLE. FLAT.
            <br />
            <span className="text-primary italic">0.5% PER PAYMENT.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-xl text-white/50 max-w-2xl leading-relaxed"
          >
            No subscriptions. No setup fees. No hidden charges. Vertex takes a
            single 0.5% fee from each payment — everything else is free.
          </motion.p>
        </section>

        {/* Fee Table */}
        <section className="pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="precision-glass border border-white/5 rounded-[40px] overflow-hidden"
          >
            <div className="p-8 border-b border-white/5">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-1">
                Full Fee Schedule
              </h2>
              <p className="text-white/40 text-sm">Effective immediately. No changes planned.</p>
            </div>
            <div className="divide-y divide-white/5">
              {feeRows.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-8 py-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div>
                    <p className="text-white font-bold text-sm">{row.label}</p>
                    <p className="text-white/30 text-xs mt-0.5">{row.note}</p>
                  </div>
                  <span
                    className={`text-sm font-black ${
                      row.value === "None" || row.value === "Free"
                        ? "text-white/30"
                        : "text-primary"
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Examples */}
        <section className="pb-24">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-4"
          >
            Fee Examples
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05, ease }}
            className="text-4xl font-black tracking-tighter text-white mb-12"
          >
            What you actually take home.
          </motion.h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {examples.map((ex, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                className="bezel-double precision-glass p-6 rounded-[28px] space-y-4"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Invoice
                </p>
                <p className="text-xl font-black text-white tracking-tight">
                  {ex.invoice}
                </p>
                <div className="h-px bg-white/5" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Vertex fee</span>
                    <span className="text-white/40">{ex.fee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-bold">You receive</span>
                    <span className="text-primary font-black">{ex.you}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="pb-24">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-4"
          >
            How We Compare
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05, ease }}
            className="text-4xl font-black tracking-tighter text-white mb-12"
          >
            Vertex vs traditional invoicing.
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="precision-glass border border-white/5 rounded-[40px] overflow-hidden"
          >
            <div className="grid grid-cols-3 border-b border-white/5">
              <div className="p-6" />
              <div className="p-6 border-l border-white/5 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Vertex
                </span>
              </div>
              <div className="p-6 border-l border-white/5 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Traditional
                </span>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {comparisons.map((row, i) => (
                <div key={i} className="grid grid-cols-3">
                  <div className="p-5 sm:p-6">
                    <p className="text-white/70 text-sm">{row.feature}</p>
                  </div>
                  <div className="p-5 sm:p-6 border-l border-white/5 flex items-center justify-center">
                    {row.vertex ? (
                      <Check className="w-5 h-5 text-primary" />
                    ) : (
                      <X className="w-5 h-5 text-white/15" />
                    )}
                  </div>
                  <div className="p-5 sm:p-6 border-l border-white/5 flex items-center justify-center">
                    {row.traditional ? (
                      <Check className="w-5 h-5 text-white/30" />
                    ) : (
                      <X className="w-5 h-5 text-white/15" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
            className="precision-glass border border-primary/20 rounded-[48px] p-16 text-center relative overflow-hidden"
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 blur-[100px] rounded-full" />
            <div className="relative z-10">
              <h3 className="text-4xl font-black tracking-tighter text-white mb-4">
                Ready to get started?
              </h3>
              <p className="text-white/40 mb-10 max-w-md mx-auto">
                Create your first invoice or payment link in under 60 seconds.
                No account required to start.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/invoice" className="vertex-btn">
                  Create Invoice
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/get-paid" className="vertex-btn-outline">
                  Create Payment Link
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
