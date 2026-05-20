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
  token: string;
  mint?: string;
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
          token: "SOL",
          slot: status.context.slot,
          timestamp: "Recently confirmed",
        });
        return;
      }

      const instructions = tx.transaction.message.instructions;
      
      let transferInstruction: ParsedInstruction | null = null;
      let tokenType: "SOL" | "SPL" = "SOL";
      let mintAddress: string | null = null;
      let decimals = 9;

      // Find system transfer first
      const solTransfer = instructions.find(
        (instruction): instruction is ParsedInstruction =>
          hasParsedInstruction(instruction) &&
          instruction.program === "system" &&
          instruction.parsed.type === "transfer"
      );

      if (solTransfer) {
        transferInstruction = solTransfer;
        tokenType = "SOL";
      } else {
        // Look for SPL token transfer or transferChecked
        const splTransfer = instructions.find(
          (instruction): instruction is ParsedInstruction =>
            hasParsedInstruction(instruction) &&
            instruction.program === "spl-token" &&
            (instruction.parsed.type === "transfer" ||
              instruction.parsed.type === "transferChecked")
        );
        if (splTransfer) {
          transferInstruction = splTransfer;
          tokenType = "SPL";
        }
      }

      const sender =
        tx.transaction.message.accountKeys[0]?.pubkey.toBase58() || "Unknown";
      let recipient = "Unknown";
      let amount = 0;
      let tokenSymbol = "SOL";

      if (transferInstruction) {
        const info = transferInstruction.parsed.info;
        if (tokenType === "SOL") {
          recipient = info?.destination || "Unknown";
          amount = info?.lamports ? Number(info.lamports) / LAMPORTS_PER_SOL : 0;
          tokenSymbol = "SOL";
        } else {
          const destinationATA = info?.destination;
          recipient = destinationATA || "Unknown";
          
          const rawAmount = info?.tokenAmount?.amount ?? info?.amount;
          
          if (transferInstruction.parsed.type === "transferChecked") {
            mintAddress = info?.mint;
          }
          
          const accountKeys = tx.transaction.message.accountKeys;
          const postBalances = tx.meta?.postTokenBalances || [];
          
          if (destinationATA) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const destIndex = accountKeys.findIndex((acc: any) => {
              if (!acc) return false;
              if (acc.pubkey && typeof acc.pubkey.toBase58 === "function") {
                return acc.pubkey.toBase58() === destinationATA;
              }
              if (typeof acc.toBase58 === "function") {
                return acc.toBase58() === destinationATA;
              }
              return String(acc) === destinationATA;
            });
            
            if (destIndex !== -1) {
              const balanceEntry = postBalances.find(b => b.accountIndex === destIndex);
              if (balanceEntry) {
                if (!mintAddress) {
                  mintAddress = balanceEntry.mint;
                }
                decimals = balanceEntry.uiTokenAmount.decimals;
                if (balanceEntry.owner) {
                  recipient = balanceEntry.owner;
                }
              }
            }
          }
          
          if (!mintAddress && postBalances.length > 0) {
            mintAddress = postBalances[0].mint;
            decimals = postBalances[0].uiTokenAmount.decimals;
          }
          
          if (mintAddress) {
            const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
            const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
            const USDT_MAINNET = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
            const USDT_DEVNET = "EJwZgeZrdC8TXTQbQBoL6bfuAnFUQYhy8jxToFdpknit";
            
            if (mintAddress === USDC_MAINNET || mintAddress === USDC_DEVNET) {
              tokenSymbol = "USDC";
            } else if (mintAddress === USDT_MAINNET || mintAddress === USDT_DEVNET) {
              tokenSymbol = "USDT";
            } else {
              tokenSymbol = "Token";
            }
          } else {
            tokenSymbol = "Token";
          }
          
          const divisor = 10 ** decimals;
          amount = rawAmount ? Number(rawAmount) / divisor : 0;
        }
      } else {
        recipient = "Contract Interaction";
      }

      setDetails({
        status: tx.meta?.err ? "failed" : "success",
        sender,
        recipient,
        amount,
        token: tokenSymbol,
        mint: mintAddress || undefined,
        slot: tx.slot,
        timestamp: tx.blockTime
          ? new Date(tx.blockTime * 1000).toLocaleString()
          : "Confirmed",
      });
    } catch (err) {
      let message = "Unable to fetch transaction details.";
      
      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("408")) {
          message = "The Solana network is currently under high load. Transaction retrieval may be delayed. Please try again in a few moments.";
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
                      <span className="text-[20px] not-italic opacity-40"> {details.token}</span>
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
                    {details.mint && (
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-white/40 uppercase">Token Mint</span>
                        <a
                          href={`https://solscan.io/token/${details.mint}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono flex items-center gap-1"
                        >
                          {details.mint.slice(0, 6)}...{details.mint.slice(-6)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
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
