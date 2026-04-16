"use client";

import { useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { useToast } from "@/components/Toast";
import { getExplorerTxUrl, NETWORK_LABEL } from "@/lib/config";

interface TxDetails {
  status: "success" | "failed" | "pending";
  sender: string;
  recipient: string;
  amount: number;
  slot: number;
  timestamp: string | null;
}

function hasParsedInstruction(
  instruction: ParsedInstruction | PartiallyDecodedInstruction
): instruction is ParsedInstruction {
  return "parsed" in instruction;
}

export default function VerifyPage() {
  const { connection } = useConnection();
  const { toast } = useToast();
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<TxDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!signature || signature.length < 32) return;

    try {
      setLoading(true);
      setError(null);
      setDetails(null);

      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx) {
        const status = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        });

        if (!status.value) {
          throw new Error("Transaction not found. Check the signature and try again.");
        }

        const isConfirmed =
          status.value.confirmationStatus === "confirmed" ||
          status.value.confirmationStatus === "finalized";

        setDetails({
          status: status.value.err ? "failed" : isConfirmed ? "success" : "pending",
          sender: "Unavailable from RPC fallback",
          recipient: "Unavailable from RPC fallback",
          amount: 0,
          slot: status.context.slot,
          timestamp: "Recently confirmed",
        });
        return;
      }

      const instructions = tx.transaction.message.instructions;
      const transferInstruction = instructions.find(
        (instruction): instruction is ParsedInstruction =>
          hasParsedInstruction(instruction) &&
          instruction.program === "system" &&
          instruction.parsed.type === "transfer"
      );

      const sender =
        tx.transaction.message.accountKeys[0]?.pubkey.toBase58() || "Unknown";
      const recipient = transferInstruction?.parsed.info?.destination || "Unknown";
      const amount = transferInstruction?.parsed.info?.lamports
        ? Number(transferInstruction.parsed.info.lamports) / LAMPORTS_PER_SOL
        : 0;

      setDetails({
        status: tx.meta?.err ? "failed" : "success",
        sender,
        recipient,
        amount,
        slot: tx.slot,
        timestamp: tx.blockTime
          ? new Date(tx.blockTime * 1000).toLocaleString()
          : "Confirmed",
      });
    } catch (err) {
      let message = "Unable to fetch transaction details.";
      
      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("408")) {
          message = "Solana Devnet is currently under high load. Transaction retrieval may be delayed. Please try again in a few moments.";
        } else {
          message = err.message;
        }
      }
      
      toast(message, "error");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 lg:py-20 architect-surface">
      <div className="text-center mb-12 space-y-4">
        <EnvironmentBadge />
        <div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Verify a <span className="text-primary italic">Transaction</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Check whether a Solana transaction landed and inspect the sender,
            recipient, and amount that reached the chain.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="precision-glass p-1 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <form onSubmit={handleVerify} className="flex flex-col md:flex-row gap-2 p-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Paste a Solana transaction signature"
                aria-label="Transaction Signature Search"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-white/5 border-none rounded-2xl px-6 py-5 pl-14 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20 group-focus-within:text-primary transition-colors" />
            </div>
            <button
              type="submit"
              disabled={loading || !signature}
              className="px-10 py-5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify"}
            </button>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-red-500/5 border border-red-500/20 rounded-3xl text-center"
            >
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4 opacity-50" />
              <p className="text-red-400 font-bold">{error}</p>
            </motion.div>
          )}

          {details && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="precision-glass p-10 rounded-[40px] border border-white/10 space-y-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-10 grayscale opacity-[0.03] -z-10 text-white">
                <ShieldCheck className="w-64 h-64" />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/5">
                <div className="flex items-center gap-6">
                  <div
                    className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl ${
                      details.status === "success"
                        ? "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/20"
                        : details.status === "failed"
                          ? "bg-red-500/10 text-red-500 shadow-red-500/20"
                          : "bg-orange-500/10 text-orange-500 shadow-orange-500/20"
                    }`}
                  >
                    {details.status === "success" ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : details.status === "failed" ? (
                      <XCircle className="w-8 h-8" />
                    ) : (
                      <Clock className="w-8 h-8 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter capitalize italic">
                      {details.status}
                    </h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">
                      {NETWORK_LABEL}
                    </p>
                  </div>
                </div>

                <a
                  href={getExplorerTxUrl(signature)}
                  target="_blank"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-colors border border-white/10"
                >
                  View on Solscan <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-white/40 mb-3 tracking-widest flex items-center gap-2">
                      <User className="w-3 h-3" /> Sender
                    </p>
                    <p className="text-xs font-mono font-bold break-all bg-white/5 p-3 rounded-xl border border-white/5 text-white/80">
                      {details.sender}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-white/40 mb-3 tracking-widest flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" /> Recipient
                    </p>
                    <p className="text-xs font-mono font-bold break-all bg-white/5 p-3 rounded-xl border border-white/5 text-white/80">
                      {details.recipient}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between p-8 bg-primary/5 rounded-[32px] border border-primary/10 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase text-primary/60 mb-1 tracking-widest">
                      Amount found
                    </p>
                    <h4 className="text-5xl font-black text-primary italic tracking-tighter">
                      {details.amount}
                      <span className="text-[20px] not-italic opacity-40"> SOL</span>
                    </h4>
                  </div>
                  <div className="mt-8 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-white/40 uppercase">Slot</span>
                      <span className="text-white">{details.slot}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-white/40 uppercase">Confirmed at</span>
                      <span className="text-white">{details.timestamp}</span>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Database className="w-20 h-20 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
