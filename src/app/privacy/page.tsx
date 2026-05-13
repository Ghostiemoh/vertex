"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const ease = [0.32, 0.72, 0, 1] as const;

const sections = [
  {
    id: "01",
    title: "Overview",
    body: `Vertex is committed to handling the limited data it collects with transparency and care. This Privacy Policy explains what data we collect, why we collect it, and how it is stored and used.

Because Vertex is built on the Solana blockchain, some information — specifically wallet addresses and on-chain transaction records — is inherently public and outside our control once broadcast to the network.`,
  },
  {
    id: "02",
    title: "What We Collect",
    body: `We collect only what is necessary to operate the Platform:

Wallet addresses — Collected when you connect a Solana wallet. Used to identify your session, save payment requests, and attribute invoices and contracts to your account.

Invoice and contract data — The details you enter when creating an invoice or contract (names, amounts, tokens, due dates, deliverables). Stored in our database to populate your dashboard.

Payment records — Transaction identifiers and payment status (sent, pending, confirmed). Used to display payment history on your dashboard.

Session data — We use Supabase Auth to manage authenticated sessions. This involves a session token stored in your browser.

We do not collect email addresses unless you provide one voluntarily (e.g. through the contact form).`,
  },
  {
    id: "03",
    title: "What We Do Not Collect",
    body: `— Private keys or seed phrases (these never leave your wallet)
— Government-issued identification
— Bank account or credit card details
— Precise geolocation
— Device fingerprints or behavioural tracking data`,
  },
  {
    id: "04",
    title: "On-Chain Data",
    body: `When a payment is initiated through Vertex, the following data is broadcast to the Solana blockchain:

— Sender wallet address
— Recipient wallet address
— Token type and amount
— Transaction memo (if provided)

This data is permanent and publicly accessible on any Solana block explorer (e.g. Solscan). Vertex has no ability to delete or modify on-chain records.`,
  },
  {
    id: "05",
    title: "How We Use Your Data",
    body: `Data collected by Vertex is used exclusively to:

— Display your invoices, contracts, and payment history on your dashboard
— Attribute payments to your account
— Generate PDF documents (invoices and contracts) on your behalf
— Improve platform functionality and diagnose errors

We do not sell, rent, or share your data with third parties for marketing purposes.`,
  },
  {
    id: "06",
    title: "Third-Party Services",
    body: `Vertex uses the following third-party services to operate:

Supabase — Database and authentication provider. Data stored with Supabase is subject to Supabase's Privacy Policy.

Solana RPC Providers — We use RPC endpoints to read blockchain state and submit transactions. RPC providers may log request metadata such as IP address and query parameters.

Vercel — Hosting and edge function provider. Vercel may collect server-side request logs.

We choose reputable providers and do not authorise them to use your data for their own purposes beyond service delivery.`,
  },
  {
    id: "07",
    title: "Data Retention",
    body: `Invoice, contract, and payment data associated with your account is retained for as long as your account is active. If you stop using Vertex and request deletion, we will remove your off-chain data from our database within 30 days.

On-chain data (wallet addresses, transaction records) cannot be deleted and will remain on the Solana blockchain permanently.`,
  },
  {
    id: "08",
    title: "Your Rights",
    body: `Depending on your jurisdiction, you may have the right to:

— Access the personal data we hold about you
— Request correction of inaccurate data
— Request deletion of your off-chain data
— Object to certain processing activities

To exercise any of these rights, contact us at priiincema@gmail.com. We will respond within 30 days.`,
  },
  {
    id: "09",
    title: "Security",
    body: `We implement industry-standard security practices including encrypted data transmission (HTTPS), Supabase row-level security policies, and session-based authentication.

No method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security but take reasonable steps to protect your data.`,
  },
  {
    id: "10",
    title: "Children",
    body: `Vertex is not intended for users under the age of 18. We do not knowingly collect data from minors. If you believe a minor has submitted personal data through the Platform, contact us and we will delete it promptly.`,
  },
  {
    id: "11",
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page will reflect the most recent revision. We encourage you to review this page periodically.

Continued use of Vertex after any update constitutes acceptance of the revised Policy.`,
  },
  {
    id: "12",
    title: "Contact",
    body: `For any privacy-related questions or requests, contact:

Muhammad Auwal Abdulaziz
Email: priiincema@gmail.com
GitHub: github.com/Ghostiemoh`,
  },
];

export default function PrivacyPage() {
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
            PRIVACY
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
            <span>Effective: <span className="text-white/50 font-bold">Immediately</span></span>
          </motion.div>
        </section>

        {/* Intro banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease }}
          className="mb-16 p-6 bg-primary/5 border border-primary/15 rounded-2xl"
        >
          <p className="text-sm text-white/60 leading-relaxed">
            Vertex collects minimal data. We do not sell your information, track
            your behaviour for advertising, or collect anything beyond what is
            required to run the Platform. This policy is written in plain
            language so you know exactly what happens with your data.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-1 pb-32">
          {sections.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.03, ease }}
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
          <Link href="/cookies" className="text-white/30 hover:text-primary transition-colors cursor-pointer">
            Cookie Policy
          </Link>
          <Link href="/contact" className="text-white/30 hover:text-primary transition-colors cursor-pointer">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
