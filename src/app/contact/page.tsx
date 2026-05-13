"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Mail, MessageSquare } from "lucide-react";
import { Github, Twitter } from "@/components/icons/BrandIcons";
import Link from "next/link";

const ease = [0.32, 0.72, 0, 1] as const;

const channels = [
  {
    icon: Mail,
    label: "Email",
    value: "priiincema@gmail.com",
    href: "mailto:priiincema@gmail.com",
    desc: "Best for billing questions, bug reports, and partnership enquiries.",
  },
  {
    icon: Twitter,
    label: "Twitter / X",
    value: "@Ghostieemoh",
    href: "https://x.com/Ghostieemoh",
    desc: "DMs are open. Good for quick questions or feedback.",
  },
  {
    icon: Github,
    label: "GitHub",
    value: "Ghostiemoh",
    href: "https://github.com/Ghostiemoh",
    desc: "Open an issue for bugs or feature requests.",
  },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = encodeURIComponent(`Name: ${name}\n\n${message}`);
    const to = "priiincema@gmail.com";
    const sub = encodeURIComponent(subject || "Vertex enquiry");
    window.open(`mailto:${to}?subject=${sub}&body=${body}`, "_blank");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  const ready = name.trim() && email.trim() && message.trim();

  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="pt-32 pb-20">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6"
          >
            Get in Touch
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-5xl lg:text-[5.5rem] font-black tracking-tighter text-white leading-[0.9] mb-8"
          >
            WE&apos;RE AVAILABLE.
            <br />
            <span className="text-primary italic">REACH OUT.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-xl text-white/50 max-w-2xl leading-relaxed"
          >
            Have a question, spotted a bug, or want to discuss a partnership?
            Pick the channel that works best for you.
          </motion.p>
        </section>

        <section className="pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Left — Channels + Form */}
            <div className="space-y-8">
              {/* Channels */}
              <div className="space-y-4">
                {channels.map((ch, i) => (
                  <motion.a
                    key={ch.label}
                    href={ch.href}
                    target={ch.href.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease }}
                    className="flex items-start gap-5 p-6 precision-glass border border-white/5 rounded-[24px] hover:border-primary/20 hover:bg-primary/[0.03] transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:border-primary transition-all">
                      <ch.icon className="w-4 h-4 text-primary group-hover:text-black transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                          {ch.label}
                        </p>
                      </div>
                      <p className="text-white font-bold truncate">{ch.value}</p>
                      <p className="text-white/40 text-xs mt-1 leading-relaxed">
                        {ch.desc}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-1" />
                  </motion.a>
                ))}
              </div>

              {/* Response time note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex items-center gap-3 px-5 py-4 bg-primary/5 border border-primary/10 rounded-2xl"
              >
                <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-xs text-white/50">
                  Typical response within{" "}
                  <span className="text-white font-bold">24 hours</span> on business
                  days.
                </p>
              </motion.div>
            </div>

            {/* Right — Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease }}
            >
              <div className="precision-glass border border-white/5 rounded-[40px] p-10 space-y-6">
                <div className="mb-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Send a message
                  </h2>
                  <p className="text-white/40 text-sm mt-1">
                    We&apos;ll reply to your email address.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-white/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-white/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Subject
                    </label>
                    <input
                      type="text"
                      placeholder="What's this about?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-white/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Message
                    </label>
                    <textarea
                      placeholder="Tell us what you need..."
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-white/20 resize-none"
                      required
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    {sent ? (
                      <motion.div
                        key="sent"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full py-4 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center gap-2 text-primary font-black text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Email client opened — thank you!
                      </motion.div>
                    ) : (
                      <motion.button
                        key="submit"
                        type="submit"
                        disabled={!ready}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="vertex-btn w-full disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Send Message
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer note */}
        <div className="pb-16 text-center">
          <p className="text-white/20 text-xs">
            For urgent payment issues, email{" "}
            <Link
              href="mailto:priiincema@gmail.com"
              className="text-primary hover:underline cursor-pointer"
            >
              priiincema@gmail.com
            </Link>{" "}
            directly with your transaction ID.
          </p>
        </div>
      </div>
    </div>
  );
}
