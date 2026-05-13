"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const ease = [0.32, 0.72, 0, 1] as const;

const cookieTypes = [
  {
    name: "Strictly Necessary",
    required: true,
    examples: ["Supabase session token", "Auth refresh token"],
    purpose: "Required for you to remain logged in and for the Platform to function. Cannot be disabled.",
  },
  {
    name: "Functional",
    required: false,
    examples: ["Wallet adapter preferences", "Last selected token (SOL/USDC/USDT)"],
    purpose: "Remember your preferences to improve your experience on return visits.",
  },
  {
    name: "Analytics",
    required: false,
    examples: ["Page view events (if enabled in future)"],
    purpose: "Help us understand how the Platform is used so we can improve it. Currently not active.",
  },
];

const sections = [
  {
    id: "01",
    title: "What Are Cookies?",
    body: `Cookies are small text files stored in your browser when you visit a website. They allow websites to remember information about your visit — such as your login state or preferences — so you don't have to re-enter them every time.

Vertex uses a minimal set of cookies. We do not use advertising cookies, tracking pixels, or third-party marketing cookies.`,
  },
  {
    id: "02",
    title: "How We Use Cookies",
    body: `Vertex uses cookies primarily for authentication. When you sign in using a connected Solana wallet, Supabase (our authentication provider) stores a session token in your browser. This token keeps you logged in as you navigate the Platform.

Without this cookie, you would need to reconnect your wallet on every page visit.`,
  },
  {
    id: "03",
    title: "Third-Party Cookies",
    body: `Vertex may indirectly set cookies through third-party services:

Supabase — Sets authentication and session cookies. These are governed by Supabase's own Privacy Policy.

Vercel — May set performance cookies for edge routing. These are technical cookies related to content delivery.

We do not use Google Analytics, Meta Pixel, or any advertising network cookies.`,
  },
  {
    id: "04",
    title: "Managing Cookies",
    body: `You can manage or delete cookies at any time through your browser settings. Most browsers allow you to:

— View cookies currently stored
— Delete individual or all cookies
— Block cookies from specific sites
— Block all third-party cookies

Note: Disabling strictly necessary cookies (such as the Supabase session token) will prevent you from staying logged in and may limit Platform functionality.

For guidance on managing cookies in your browser, visit the browser's help documentation.`,
  },
  {
    id: "05",
    title: "Cookie Retention",
    body: `Strictly necessary session cookies: Expire when you close your browser or log out explicitly.

Functional preference cookies: Retained for up to 90 days, or until you clear your browser storage.

We do not set cookies with lifetimes longer than 12 months.`,
  },
  {
    id: "06",
    title: "Changes to This Policy",
    body: `We may update this Cookie Policy if we add new functionality that requires additional cookies. The "Last updated" date reflects the most recent revision.

We will not introduce advertising or tracking cookies without updating this policy and, where required, obtaining your consent.`,
  },
  {
    id: "07",
    title: "Contact",
    body: `If you have questions about how Vertex uses cookies, contact us at priiincema@gmail.com.`,
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="pt-32 pb-16">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6"
          >
            Legal
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-5xl lg:text-7xl font-black tracking-tighter text-white leading-[0.9] mb-8"
          >
            COOKIE
            <br />
            <span className="text-primary italic">POLICY.</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-wrap gap-6 text-xs text-white/30"
          >
            <span>Last updated: <span className="text-white/50 font-bold">May 2025</span></span>
            <span>Advertising cookies: <span className="text-primary font-bold">None</span></span>
          </motion.div>
        </section>

        {/* Cookie type table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease }}
          className="mb-16 precision-glass border border-white/5 rounded-[32px] overflow-hidden"
        >
          <div className="p-6 border-b border-white/5">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
              Cookie Categories
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {cookieTypes.map((ct) => (
              <div key={ct.name} className="p-6 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-white font-black text-sm">{ct.name}</h3>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      ct.required
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-white/5 text-white/30 border border-white/10"
                    }`}
                  >
                    {ct.required ? "Required" : "Optional"}
                  </span>
                </div>
                <p className="text-white/40 text-xs leading-relaxed">{ct.purpose}</p>
                <div className="flex flex-wrap gap-2">
                  {ct.examples.map((ex) => (
                    <span
                      key={ex}
                      className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-[10px] text-white/30 font-mono"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-1 pb-32">
          {sections.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.04, ease }}
              className="border-b border-white/5 py-10"
            >
              <div className="flex gap-8 items-start">
                <span className="text-[10px] font-black text-white/15 tracking-widest pt-1 min-w-[28px]">
                  {s.id}
                </span>
                <div className="flex-1">
                  <h2 className="text-lg font-black text-white tracking-tight mb-5">
                    {s.title}
                  </h2>
                  <div className="text-white/50 text-sm leading-relaxed whitespace-pre-line">
                    {s.body}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="pb-24 flex flex-wrap gap-6 text-xs">
          <Link href="/terms" className="text-white/30 hover:text-primary transition-colors cursor-pointer">
            Terms of Use
          </Link>
          <Link href="/privacy" className="text-white/30 hover:text-primary transition-colors cursor-pointer">
            Privacy Policy
          </Link>
          <Link href="/contact" className="text-white/30 hover:text-primary transition-colors cursor-pointer">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
