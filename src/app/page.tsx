"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  FileText,
  Globe,
  LayoutGrid,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { VertexHeroVisual } from "@/components/VertexHero";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";

const tools = [
  {
    title: "Create Invoice",
    description:
      "Build a payment-ready PDF invoice with a wallet address, due date, and shareable payment link.",
    href: "/invoice",
    icon: FileText,
    color: "bg-primary/20",
    size: "col-span-1 md:col-span-2",
  },
  {
    title: "Draft Agreement",
    description:
      "Generate a clean service agreement draft you can review before sending to a client.",
    href: "/contract",
    icon: LayoutGrid,
    color: "bg-white/5",
    size: "col-span-1",
  },
  {
    title: "Track Payments",
    description:
      "See recent invoices, clients, and what has been paid or is still outstanding.",
    href: "/dashboard",
    icon: CreditCard,
    color: "bg-primary",
    size: "col-span-1",
  },
  {
    title: "Manage Clients",
    description:
      "Store billing contacts and reuse them when you create invoices or agreement drafts.",
    href: "/clients",
    icon: Globe,
    color: "bg-white/5",
    size: "col-span-1 md:col-span-2",
  },
  {
    title: "Share Payment Link",
    description:
      "Create a direct payment link for clients who do not need a full invoice first.",
    href: "/get-paid",
    icon: ArrowUpRight,
    color: "bg-primary/40",
    size: "col-span-1 md:col-span-2",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Wallet-signed documents",
    desc: "Add a wallet-backed proof of authorship to invoices and agreement drafts.",
  },
  {
    icon: Wallet,
    title: "Crypto payment links",
    desc: "Request SOL, USDC, or USDT with clear recipient, fee, and network details.",
  },
  {
    icon: CreditCard,
    title: "Freelancer-friendly workflow",
    desc: "Built for solo operators and small agencies working with international clients.",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-x-hidden pt-10 pb-20 architect-surface">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1 order-2 lg:order-1">
            <VertexHeroVisual />
          </div>

          <div className="flex-1 order-1 lg:order-2 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <EnvironmentBadge className="mb-8" />

              <h1 className="text-6xl lg:text-[6.5rem] font-black tracking-tighter mb-8 leading-[0.9] text-white">
                CRYPTO INVOICING
                <br />
                FOR CLIENT WORK.
              </h1>

              <p className="text-xl text-muted-foreground/80 max-w-2xl mb-12 leading-relaxed font-medium">
                Vertex helps freelancers and small agencies create invoices,
                share wallet-based payment links, and keep a clear record of
                what has been paid.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/invoice" className="vertex-btn w-full sm:w-auto">
                  Create Invoice
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/get-paid"
                  className="vertex-btn-outline w-full sm:w-auto"
                >
                  Create Payment Link
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-12 border-y border-white/5 mb-32 bg-white/[0.02] rounded-[40px] px-12">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-6 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/5 group-hover:bg-primary group-hover:text-black transition-all flex-shrink-0">
                <feature.icon className="w-6 h-6" />
              </div>
              <div className="pt-1">
                <p className="text-[10px] font-black text-white leading-none mb-3 uppercase tracking-widest">
                  {feature.title}
                </p>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <section className="py-20 lg:py-32">
          <div className="mb-20">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-primary mb-4">
              What You Can Do
            </h2>
            <h3 className="text-4xl lg:text-6xl font-black tracking-tighter text-white">
              Everything you need to ask for payment
              <br />
              <span className="text-muted-foreground">
                without losing the paper trail.
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                tabIndex={0}
                className={`group relative p-8 rounded-[32px] bezel-double precision-glass transition-all cursor-pointer overflow-hidden ${tool.size}`}
              >
                <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  <ArrowUpRight className="w-6 h-6 text-primary" />
                </div>

                <div
                  className={`w-14 h-14 rounded-2xl ${tool.color} flex items-center justify-center mb-8 border border-white/5`}
                >
                  <tool.icon
                    className={`w-7 h-7 ${
                      tool.color.includes("bg-primary")
                        ? "text-black"
                        : "text-primary"
                    }`}
                  />
                </div>

                <h3 className="text-2xl font-black text-white mb-3 tracking-tight uppercase">
                  {tool.title}
                </h3>
                <p className="text-base text-muted-foreground/70 leading-relaxed max-w-[280px]">
                  {tool.description}
                </p>

                <Link href={tool.href} className="absolute inset-0 z-10" />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-32 text-center">
          <div className="precision-glass border border-primary/20 p-20 rounded-[48px] relative overflow-hidden group">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 blur-[120px] rounded-full group-hover:bg-primary/30 transition-all" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 blur-[120px] rounded-full" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-8 animate-pulse" />
              <h2 className="text-4xl lg:text-6xl font-black tracking-tighter mb-8 text-white">
                Clear payment requests.
                <br />
                <span className="italic">Clearer client conversations.</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12">
                Start with an invoice or a direct payment link, then keep your
                records in one place as payments arrive.
              </p>
              <Link
                href="/invoice"
                className="px-12 py-6 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-primary hover:text-white transition-all inline-block cursor-pointer"
              >
                Create Your First Invoice
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
