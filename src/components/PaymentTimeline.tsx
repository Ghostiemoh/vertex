"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Send,
  ShieldAlert,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import { getExplorerTxUrl } from "@/lib/config";

export interface PaymentTimelineEvent {
  id: string;
  event_type: string;
  status: string;
  signature: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface PaymentTimelineProps {
  events: PaymentTimelineEvent[];
  createdAt: string;
}

export function PaymentTimeline({ events = [], createdAt }: PaymentTimelineProps) {
  // Build full timeline list
  const rawEvents = [
    {
      id: "created",
      event_type: "request_created",
      title: "Request Initiated",
      description: "The payment request was generated on-chain.",
      created_at: createdAt,
      signature: null,
      details: {}
    },
    ...events
  ];

  // Sort events chronologically to be absolutely certain
  const sortedEvents = [...rawEvents].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const getEventConfig = (eventType: string, isLast: boolean, isFailed: boolean) => {
    switch (eventType) {
      case "request_created":
        return {
          title: "Request Initiated",
          description: "Vertex generated the secure payment link.",
          icon: FileText,
          iconColor: "text-white/60",
          bgColor: "bg-white/5",
          borderColor: "border-white/10"
        };
      case "invoice_viewed":
        return {
          title: "Request Viewed",
          description: "The payer accessed the payment checkout page.",
          icon: Eye,
          iconColor: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20"
        };
      case "payment_submitted":
        return {
          title: "Transaction Broadcasted",
          description: "Payment signed and broadcasted to the Solana network.",
          icon: Send,
          iconColor: isLast && !isFailed ? "text-yellow-400" : "text-primary",
          bgColor: isLast && !isFailed ? "bg-yellow-500/10 animate-pulse" : "bg-primary/10",
          borderColor: isLast && !isFailed ? "border-yellow-500/30" : "border-primary/20"
        };
      case "payment_confirmed":
        return {
          title: "On-Chain Confirmation",
          description: "Transaction confirmed on-chain. Awaiting finality...",
          icon: ShieldCheck,
          iconColor: isLast && !isFailed ? "text-primary animate-pulse" : "text-primary",
          bgColor: isLast && !isFailed ? "bg-primary/15 animate-pulse" : "bg-primary/10",
          borderColor: "border-primary/20"
        };
      case "payment_finalized":
        return {
          title: "Settlement Finalized",
          description: "Full finality achieved. Funds safely settled to the treasury.",
          icon: CheckCircle2,
          iconColor: "text-primary",
          bgColor: "bg-primary/20",
          borderColor: "border-primary/30"
        };
      case "payment_failed":
        return {
          title: "Settlement Failed",
          description: "The payment verification failed or transaction was reverted.",
          icon: ShieldAlert,
          iconColor: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20"
        };
      default:
        return {
          title: eventType.replace(/_/g, " "),
          description: "System event logged.",
          icon: Clock,
          iconColor: "text-white/40",
          bgColor: "bg-white/5",
          borderColor: "border-white/10"
        };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    } catch {
      return "--:--:--";
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const hasFailed = sortedEvents.some(e => e.event_type === "payment_failed");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bezel-double precision-glass p-8 rounded-[32px] relative overflow-hidden w-full space-y-6"
    >
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Settlement History
          </h3>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">
            Real-time verification audit trail
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[8px] font-black text-primary uppercase tracking-widest">Active Audit</span>
        </div>
      </div>

      <div className="relative pl-4 sm:pl-6 space-y-8 py-2">
        {/* Vertical connector line */}
        <div className="absolute left-[33px] sm:left-[41px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-white/10 via-primary/20 to-white/5" />

        {sortedEvents.map((event, idx) => {
          const isLast = idx === sortedEvents.length - 1;
          const config = getEventConfig(event.event_type, isLast, hasFailed);
          const IconComponent = config.icon;

          return (
            <motion.div
              key={event.id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="flex items-start gap-4 sm:gap-6 group relative"
            >
              {/* Timestamp */}
              <div className="w-14 sm:w-16 flex-shrink-0 text-right pt-1.5">
                <p className="text-[10px] font-mono font-bold text-white/70 leading-none">
                  {formatTime(event.created_at)}
                </p>
                <p className="text-[8px] font-black text-white/30 uppercase tracking-tight mt-1">
                  {formatDate(event.created_at)}
                </p>
              </div>

              {/* Bullet Icon */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border ${config.bgColor} ${config.borderColor} z-10 transition-all group-hover:scale-105`}
              >
                <IconComponent className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${config.iconColor}`} />
              </div>

              {/* Details Content */}
              <div className="flex-grow space-y-1 pt-1">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none">
                    {config.title}
                  </h4>
                  {isLast && !hasFailed && event.event_type !== "payment_finalized" && (
                    <span className="text-[8px] font-black uppercase text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 tracking-widest animate-pulse">
                      In Flight
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed font-medium">
                  {(event.details as { reason?: string })?.reason || config.description}
                </p>

                {/* On-Chain proofs / signatures */}
                {event.signature && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(getExplorerTxUrl(event.signature!), "_blank")}
                      className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      <span>Proof: {event.signature.slice(0, 8)}...{event.signature.slice(-8)}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
