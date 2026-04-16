"use client";

import { use, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import confetti from "canvas-confetti";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { useToast } from "@/components/Toast";
import {
  calculatePaymentBreakdown,
  getTokenDecimals,
  getTokenMint,
  type PaymentRequest,
  type PaymentToken,
} from "@/lib/payment-utils";
import {
  getExplorerTxUrl,
  NETWORK_LABEL,
  PLATFORM_FEE_ENABLED,
  TREASURY_WALLET,
} from "@/lib/config";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PaymentRecord {
  request: PaymentRequest;
  invoice: {
    invoice_number?: string;
    client_name?: string;
    status?: string;
    signature?: string;
    tx_hash?: string;
  } | null;
  breakdown: {
    recipientAmount: number;
    platformFee: number;
    totalAmount: number;
    feeEnabled: boolean;
  };
}

const TOKEN_LABELS: Record<PaymentToken, { color: string }> = {
  SOL: { color: "text-[#14F195]" },
  USDC: { color: "text-[#2775CA]" },
  USDT: { color: "text-[#26A17B]" },
};

export default function PaymentPage({ params }: PageProps) {
  const { id } = use(params);
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<PaymentRecord | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPaymentData() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/payments/${id}`);
        const data = (await response.json()) as PaymentRecord & { error?: string };

        if (!response.ok || !data.request) {
          throw new Error(data.error || "Invalid payment link.");
        }

        setPaymentData(data);
        if (data.invoice?.status === "paid" && data.invoice.tx_hash) {
          setTxHash(data.invoice.tx_hash);
          setStatus("success");
        }
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to load payment request.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPaymentData();
  }, [id]);

  useEffect(() => {
    if (status === "success") {
      confetti({
        particleCount: 160,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#79F1F1", "#ffffff", "#000000"],
      });
    }
  }, [status]);

  const handlePayment = async () => {
    if (!publicKey || !paymentData) return;

    try {
      setStatus("processing");
      setError(null);

      const { request, breakdown } = paymentData;
      const recipientPubkey = new PublicKey(request.recipient);
      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      const transaction = new Transaction();

      if (request.memo) {
        transaction.add(
          new TransactionInstruction({
            keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
            data: Buffer.from(request.memo, "utf-8"),
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          })
        );
      }

      if (request.token === "SOL") {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPubkey,
            lamports: Math.round(request.amount * 1_000_000_000),
          })
        );

        if (PLATFORM_FEE_ENABLED && breakdown.platformFee > 0) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: treasuryPubkey,
              lamports: Math.round(breakdown.platformFee * 1_000_000_000),
            })
          );
        }
      } else {
        const tokenType = request.token as Exclude<PaymentToken, "SOL">;
        const mintPubkey = getTokenMint(
          tokenType,
          request.network === "devnet" ? "devnet" : "mainnet"
        );
        const decimals = getTokenDecimals(request.token);
        const senderAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
        const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

        try {
          await getAccount(connection, recipientAta);
        } catch {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              recipientAta,
              recipientPubkey,
              mintPubkey
            )
          );
        }

        transaction.add(
          createTransferInstruction(
            senderAta,
            recipientAta,
            publicKey,
            Math.round(request.amount * 10 ** decimals)
          )
        );

        if (PLATFORM_FEE_ENABLED && breakdown.platformFee > 0) {
          const treasuryAta = await getAssociatedTokenAddress(mintPubkey, treasuryPubkey);
          try {
            await getAccount(connection, treasuryAta);
          } catch {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey,
                treasuryAta,
                treasuryPubkey,
                mintPubkey
              )
            );
          }

          transaction.add(
            createTransferInstruction(
              senderAta,
              treasuryAta,
              publicKey,
              Math.round(breakdown.platformFee * 10 ** decimals)
            )
          );
        }
      }

      const signature = await sendTransaction(transaction, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      });

      const verifyResponse = await fetch(`/api/payments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });

      const verifyData = (await verifyResponse.json()) as { error?: string };
      if (!verifyResponse.ok) {
        throw new Error(
          verifyData.error ||
            "The transaction landed, but Vertex could not verify it yet."
        );
      }

      setTxHash(signature);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong with the payment.";
      toast(message, "error");
      setError(message);
      setStatus("error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Loading payment request...
          </p>
        </div>
      </div>
    );
  }

  const request = paymentData?.request;
  const invoice = paymentData?.invoice;
  const breakdown = paymentData?.breakdown || calculatePaymentBreakdown(0);
  const tokenStyle = request ? TOKEN_LABELS[request.token] : TOKEN_LABELS.SOL;

  return (
    <div className="max-w-xl mx-auto px-4 py-12 lg:py-20 space-y-6">
      <EnvironmentBadge />

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bezel-double liquid-glass p-12 rounded-[40px] text-center"
          >
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-primary/20">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter italic">
              Payment complete
            </h1>
            <p className="text-muted-foreground/70 mb-10 text-lg">
              Vertex verified a payment of{" "}
              <span className="text-white font-black">
                {request?.amount} {request?.token}
              </span>
              .
            </p>

            <div className="bg-black/40 p-4 rounded-xl mb-8 border border-white/5 overflow-hidden">
              <p className="text-xs text-muted-foreground mb-2 text-left uppercase font-bold tracking-widest">
                Transaction hash
              </p>
              <p className="text-[10px] font-mono text-primary/80 break-all text-left">
                {txHash}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {txHash && (
                <button
                  onClick={() => window.open(getExplorerTxUrl(txHash), "_blank")}
                  className="vertex-btn-outline w-full"
                >
                  View on Solscan <ExternalLink className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="vertex-btn w-full"
              >
                Back to Vertex
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="payment-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bezel-double liquid-glass rounded-[40px] overflow-hidden">
              <div className="bg-primary/5 p-10 border-b border-white/5 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 block">
                  Ready to pay
                </span>
                <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic">
                  {request?.amount}{" "}
                  <span className="text-primary">{request?.token}</span>
                </h2>
                <p className="text-xs text-white/40 mt-4 font-mono">{NETWORK_LABEL}</p>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  {invoice?.invoice_number && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Invoice</span>
                      <span className="text-white font-medium">
                        #{invoice.invoice_number}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">
                      {request?.recipient.slice(0, 4)}...{request?.recipient.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-white font-medium text-right max-w-[220px]">
                      {request?.description || "Direct payment"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">You send</span>
                    <span className={`font-bold ${tokenStyle.color}`}>
                      {breakdown.totalAmount.toFixed(
                        request?.token === "SOL" ? 4 : 2
                      )}{" "}
                      {request?.token}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Recipient gets</span>
                    <span className="text-white font-medium">
                      {breakdown.recipientAmount.toFixed(
                        request?.token === "SOL" ? 4 : 2
                      )}{" "}
                      {request?.token}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Vertex fee</span>
                    <span className="text-white font-medium">
                      {breakdown.platformFee.toFixed(
                        request?.token === "SOL" ? 4 : 2
                      )}{" "}
                      {request?.token}
                    </span>
                  </div>

                  {invoice?.signature && (
                    <div className="flex justify-between items-start text-[10px] pt-4 border-t border-white/5">
                      <span className="text-primary font-black uppercase tracking-tighter flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Sender proof
                      </span>
                      <span className="text-white/30 font-mono break-all max-w-[150px] text-right">
                        {invoice.signature.slice(0, 32)}...
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground leading-relaxed">
                  Review the recipient wallet, network, and fee before approving
                  the transaction in your wallet. Network fees are set by the
                  wallet separately.
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  {!connected ? (
                    <div className="flex justify-center">
                      <WalletMultiButton className="!bg-primary !rounded-2xl !h-16 !px-12 !w-full hover:!bg-primary/90 transition-all !font-black !text-xs !uppercase !tracking-widest !text-black" />
                    </div>
                  ) : (
                    <button
                      onClick={handlePayment}
                      disabled={status === "processing"}
                      className="vertex-btn w-full !h-16 !text-lg"
                    >
                      {status === "processing" ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Verifying payment...
                        </>
                      ) : (
                        <>
                          Pay now
                          <ChevronRight className="w-6 h-6" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
