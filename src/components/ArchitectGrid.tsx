"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function ArchitectGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  
  // Subtle parallax effect on scroll for depth
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] architect-surface architect-grid-pattern"
    >
      <motion.div 
        style={{ y }}
        className="absolute inset-0"
      />
    </div>
  );
}
