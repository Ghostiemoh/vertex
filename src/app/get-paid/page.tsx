"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";
import { WalletAuthButton } from "@/components/WalletAuthButton";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { useSession } from "@/components/SessionProvider";
import {
  calculatePaymentBreakdown,
  encodePaymentRequest,
  getPaymentUrl,
  isValidSolanaAddress,
  type PaymentToken,
} from "@/lib/payment-utils";
import { getOrigin } from "@/lib/utils";

const TOKEN_OPTIONS: { value: PaymentToken; label: string; color: string }[] = [
  { value: "SOL", label: "SOL", color: "bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white" },
  { value: "USDC", label: "USDC", color: "bg-[#2775CA] text-white" },
  { value: "USDT", label: "USDT", color: "bg-[#26A17B] text-white" },
];

export default function GetPaidPage() {
  const { publicKey, connected } = useWallet();
  const { isAuthenticated } = useSession();
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<PaymentToken>("SOL");
  const [description, setDescription] = useState("");
  const [manualWallet, setManualWallet] = useState("");
  const [copied, setCopied] = useState(false);

  const effectiveWallet = connected
    ? publicKey?.toBase58() ?? ""
    : manualWallet.trim();
  const walletIsValid = isValidSolanaAddress(effectiveWallet);
  const numericAmount = Number(amount || "0");
  const breakdown = calculatePaymentBreakdown(numericAmount);

  const generatedLink = useMemo(() => {
    if (!walletIsValid || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return "";
    }

    const encoded = encodePaymentRequest({
      recipient: effectiveWallet,
      amount: numericAmount,
      token,
      description: description || undefined,
    });

    return getPaymentUrl(getOrigin(), encoded);
  }, [description, effectiveWallet, numericAmount, token, walletIsValid]);

  const copyToClipboard = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <EnvironmentBadge />
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
                Create a <span className="text-primary">Payment Link</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Generate a clear payment request for a client before you send a
                full invoice.
              </p>
            </div>
          </div>

          <div className="glass-dark p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="p-4 rounded-xl flex items-center justify-between bg-white/5 border border-white/10">
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  {connected ? "Wallet connected" : "Connect a wallet or enter a recipient"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isAuthenticated
                    ? "Your signed-in Vertex session can save linked invoice records."
                    : "Sign in after connecting if you want Vertex to keep authenticated records."}
                </p>
              </div>
              <WalletAuthButton />
            </div>

            {!connected && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-white uppercase tracking-wider">
                  Recipient Wallet
                </label>
                <input
                  type="text"
                  placeholder="Enter Solana address"
                  value={manualWallet}
                  onChange={(e) => setManualWallet(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                {manualWallet && !walletIsValid && (
                  <p className="text-xs text-red-400">
                    Enter a valid Solana wallet address before creating a link.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-white uppercase tracking-wider">
                Amount Requested
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                  {TOKEN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setToken(option.value)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        token === option.value
                          ? `${option.color} shadow-lg`
                          : "bg-white/5 text-muted-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-white uppercase tracking-wider">
                Note for Client
              </label>
              <input
                type="text"
                placeholder="Example: April design retainer"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-4 h-4" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Payment preview
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/80">
                  <span>Client sends</span>
                  <span>{breakdown.totalAmount.toFixed(token === "SOL" ? 4 : 2)} {token}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>You receive</span>
                  <span>{breakdown.recipientAmount.toFixed(token === "SOL" ? 4 : 2)} {token}</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Vertex fee</span>
                  <span>{breakdown.platformFee.toFixed(token === "SOL" ? 4 : 2)} {token}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Network fees are paid separately by the sender&apos;s wallet.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:sticky lg:top-32"
        >
          <AnimatePresence mode="wait">
            {generatedLink ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass p-8 rounded-3xl border border-primary/30 bg-primary/[0.03] space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Client payment link</h3>
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                    <LinkIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="bg-black/40 p-4 rounded-xl border border-white/5 break-all font-mono text-xs text-muted-foreground">
                  {generatedLink}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={copyToClipboard} className="vertex-btn">
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => window.open(generatedLink, "_blank")}
                    className="vertex-btn-outline"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open Link
                  </button>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-2">
                  <p className="text-white font-bold text-sm">What the client sees</p>
                  <p className="text-muted-foreground text-xs">
                    Amount, token, recipient wallet, network, and Vertex fee breakdown.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="h-[420px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl text-center p-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <CreditCard className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white/50">
                  Add a valid wallet and amount
                </h3>
                <p className="text-white/20 text-sm max-w-[240px] mx-auto mt-2">
                  Vertex will build a payer-ready link once the request is complete.
                </p>
              </div>
            )}
          </AnimatePresence>

          {effectiveWallet && !walletIsValid && (
            <div className="mt-4 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                The payment link is blocked until the recipient wallet is valid.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
