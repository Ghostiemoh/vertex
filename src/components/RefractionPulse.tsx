"use client";

import { motion } from "framer-motion";

export function RefractionPulse() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-20">
      {/* Primary Pulse Line */}
      <motion.div 
        animate={{ 
          x: ["-100%", "200%"],
          opacity: [0, 1, 1, 0]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "linear",
          times: [0, 0.1, 0.9, 1]
        }}
        className="absolute top-1/4 left-0 w-64 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
      />
      
      {/* Secondary Pulse Line */}
      <motion.div 
        animate={{ 
          x: ["200%", "-100%"],
          opacity: [0, 1, 1, 0]
        }}
        transition={{ 
          duration: 12, 
          repeat: Infinity, 
          ease: "linear", 
          delay: 2,
          times: [0, 0.1, 0.9, 1]
        }}
        className="absolute bottom-1/3 left-0 w-96 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"
      />

      {/* Vertical Accent Pulse */}
      <motion.div 
        animate={{ 
          y: ["-100%", "200%"],
          opacity: [0, 0.5, 0.5, 0]
        }}
        transition={{ 
          duration: 15, 
          repeat: Infinity, 
          ease: "linear", 
          delay: 5,
          times: [0, 0.1, 0.9, 1]
        }}
        className="absolute left-1/4 top-0 w-[1px] h-64 bg-gradient-to-b from-transparent via-primary/50 to-transparent"
      />
    </div>
  );
}
