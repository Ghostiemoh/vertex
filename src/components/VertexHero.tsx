"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { ArchitectGrid } from "./ArchitectGrid";
import { RefractionPulse } from "./RefractionPulse";

export function VertexHeroVisual() {
  return (
    <div className="relative w-full h-[500px] lg:h-[700px] flex items-center justify-center overflow-hidden architect-surface">
      <ArchitectGrid />
      <RefractionPulse />
      
      {/* Background Hero Image with Mask */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <Image 
          src="/hero.png" 
          alt="Vertex Flow Visual" 
          fill
          className="object-cover opacity-60 mix-blend-screen"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </motion.div>

      {/* Floating Precision Cards */}
      <motion.div 
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="relative z-20 w-80 p-6 bezel-double precision-glass rounded-3xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-primary">Status</p>
            <p className="text-xs font-bold text-white uppercase italic">Active Flow</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="h-px bg-white/5" />
          <div className="flex justify-between text-[10px]">
            <span className="text-white/40 uppercase tracking-widest">Relay</span>
            <span className="text-white font-mono">Instant</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-white/40 uppercase tracking-widest">Settlement</span>
            <span className="text-white font-mono">Liquid</span>
          </div>
        </div>

        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Liquid Settlement</p>
        </div>
      </motion.div>
    </div>
  );
}
