"use client";

import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Wallet } from "lucide-react";

export function ReputationWidget() {
  return (
    <div className="bezel-double liquid-glass rounded-[32px] p-8 space-y-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-all" />

      <div className="relative z-10 flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            Payment Checklist
          </p>
          <h3 className="text-4xl font-black text-white italic tracking-tighter">
            READY
          </h3>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-black shadow-xl shadow-primary/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="h-px bg-white/5" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">
              Recipient proof
            </p>
            <div className="flex items-center gap-2">
              <Wallet className="w-3 h-3 text-primary" />
              <p className="text-lg font-bold text-white uppercase italic tracking-tighter">
                Wallet
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">
              Payment trail
            </p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-primary" />
              <p className="text-lg font-bold text-white uppercase italic tracking-tighter">
                On-chain
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-1">
            <span className="text-white/30">Invoice coverage</span>
            <span className="text-primary">3 key checks</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "85%" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-primary"
            />
          </div>
        </div>
      </div>

      <div className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white text-center">
        Wallet, amount, and history all visible
      </div>
    </div>
  );
}
