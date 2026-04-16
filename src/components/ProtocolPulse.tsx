"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PythHttpClient, getPythProgramKeyForCluster } from "@pythnetwork/client";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Cpu, Globe, TrendingUp } from "lucide-react";
import { VERTEX_NETWORK, NETWORK_SHORT_LABEL } from "@/lib/config";

export function ProtocolPulse() {
  const { connection } = useConnection();
  const [price, setPrice] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [latency, setLatency] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<"optimal" | "degraded" | "syncing">("syncing");
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    const pythClient = new PythHttpClient(
      connection,
      getPythProgramKeyForCluster(VERTEX_NETWORK)
    );

    const updateStats = async () => {
      try {
        const start = performance.now();
        const data = await pythClient.getData();
        const solPrice = data.productPrice.get("Crypto.SOL/USD");

        if (solPrice?.price) {
          setPrice(solPrice.price);
          setLastUpdate(Date.now());
        }

        const currentSlot = await connection.getSlot();
        setSlot(currentSlot);
        setLatency(Math.round(performance.now() - start));
        setNetworkStatus("optimal");
      } catch (error) {
        setNetworkStatus("degraded");
        if (error instanceof Error && !error.message.includes("Failed to fetch")) {
          console.error("Market widget exception:", error);
        }
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, [connection]);

  return (
    <div className="bezel-double precision-glass rounded-[40px] p-10 space-y-12 relative overflow-hidden group">
      {/* Optimized Price Update Indicator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lastUpdate}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-primary/20 pointer-events-none"
        />
      </AnimatePresence>

      <div className="relative z-10 flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[12px] font-black uppercase tracking-[0.4em] text-primary">
            Market Snapshot
          </p>
          <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Solana
          </h3>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
          <Activity className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
              SOL price
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-white tracking-tighter">
              {price ? `$${price.toFixed(2)}` : "---"}
            </p>
            <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-tighter">
              SOL / USD
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
              Current slot
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-black text-white tracking-tighter">
              {slot ? slot.toLocaleString() : "---"}
            </p>
            <p className="text-[11px] text-white/60 font-bold uppercase tracking-tighter">
              RPC view
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-white/5 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div 
              className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-500 ${
                networkStatus === "optimal" 
                  ? "bg-emerald-500 text-emerald-500" 
                  : networkStatus === "degraded"
                    ? "bg-orange-500 text-orange-500"
                    : "bg-white/20 text-white/20"
              }`} 
            />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
              {networkStatus === "degraded" ? "RPC Delayed" : `Network: ${NETWORK_SHORT_LABEL}`}
            </p>
          </div>
          <p className="text-[11px] font-bold text-white/60 uppercase tracking-tighter">
            {networkStatus === "degraded" ? "---" : `${latency}ms`}
          </p>
        </div>

        <div className="flex items-center gap-8 justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">
              On-chain context
            </span>
          </div>
          <div className="h-1 flex-grow bg-white/5 mx-2 rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-primary/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
