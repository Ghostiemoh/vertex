import { NextResponse } from "next/server";
import {
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  calculatePaymentBreakdown,
  decodePaymentRequest,
  getTokenDecimals,
  getTokenMint,
  toAtomicUnits,
  type PaymentRequest,
  type PaymentToken,
} from "@/lib/payment-utils";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TREASURY_WALLET } from "@/lib/config";
import { logVertexEvent } from "@/lib/monitoring";
import { mapLegacyInvoiceStatus, type PaymentStatus } from "@/lib/payments";
import { withRpcFallback } from "@/lib/rpc";

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  client_name: string | null;
  total: number | null;
  token: string | null;
  status: string | null;
  signature: string | null;
  tx_hash: string | null;
  auth_user_id: string | null;
  payment_id: string | null;
  network: string | null;
  recipient_wallet: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  finalized_at: string | null;
  created_at: string;
}

interface PaymentRequestRow {
  id: string;
  auth_user_id: string;
  invoice_id: string | null;
  source: string;
  label: string | null;
  description: string | null;
  network: "devnet" | "mainnet-beta";
  recipient_wallet: string;
  amount: number;
  token: PaymentToken;
  memo: string | null;
  fee_bps: number;
  payment_status: string;
  signature: string | null;
  confirmation_status: "processed" | "confirmed" | "finalized" | null;
  confirmed_at: string | null;
  finalized_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

function hasParsedInstruction(
  instruction: ParsedInstruction | PartiallyDecodedInstruction
): instruction is ParsedInstruction {
  return "parsed" in instruction;
}

function normalizePaymentStatus(
  confirmationStatus: "processed" | "confirmed" | "finalized" | null,
  fallbackStatus: string | null | undefined
): PaymentStatus {
  if (confirmationStatus === "finalized") return "payment_finalized";
  if (confirmationStatus === "confirmed") return "payment_confirmed";
  return mapLegacyInvoiceStatus(fallbackStatus);
}

// Sliding-window rate limiter (per serverless instance).
// For distributed limiting across all Vercel instances, replace with Upstash Redis.
const _rateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (_rateMap.get(ip) ?? []).filter((t) => t > now - RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return true;
  hits.push(now);
  _rateMap.set(ip, hits);
  return false;
}

class RetriableVerificationError extends Error {
  readonly retriable = true;
  constructor(message: string) {
    super(message);
    this.name = "RetriableVerificationError";
  }
}

async function verifyTransaction(
  request: PaymentRequest,
  signature: string
): Promise<"confirmed" | "finalized"> {
  const tx = await withRpcFallback("verify-payment", (connection) =>
    connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    })
  );

  if (!tx) {
    throw new RetriableVerificationError(
      "Transaction not found on-chain yet. Please retry in a few seconds."
    );
  }

  if (tx.meta?.err) {
    throw new Error("The transaction failed on-chain and cannot be verified.");
  }

  const instructions = tx.transaction.message.instructions;
  const recipient = request.recipient;
  const treasury = TREASURY_WALLET;
  const breakdown = calculatePaymentBreakdown(request.amount);

  if (request.memo) {
    const memoInstruction = instructions.find((instruction) => {
      if (!hasParsedInstruction(instruction)) return false;
      return instruction.program === "spl-memo" && instruction.parsed === request.memo;
    });

    if (!memoInstruction) {
      throw new Error("The transaction memo did not match the expected payment request.");
    }
  }

  if (request.token === "SOL") {
    const lamports = toAtomicUnits(request.amount, "SOL");
    const feeLamports = toAtomicUnits(breakdown.platformFee, "SOL");

    const recipientTransfer = instructions.some((instruction) => {
      if (!hasParsedInstruction(instruction)) return false;
      return (
        instruction.programId.equals(SystemProgram.programId) &&
        instruction.parsed?.type === "transfer" &&
        instruction.parsed.info?.destination === recipient &&
        Number(instruction.parsed.info?.lamports) >= lamports
      );
    });

    const feeTransfer =
      !breakdown.feeEnabled ||
      instructions.some((instruction) => {
        if (!hasParsedInstruction(instruction)) return false;
        return (
          instruction.programId.equals(SystemProgram.programId) &&
          instruction.parsed?.type === "transfer" &&
          instruction.parsed.info?.destination === treasury &&
          Number(instruction.parsed.info?.lamports) >= feeLamports
        );
      });

    if (!recipientTransfer || !feeTransfer) {
      throw new Error("The SOL transfer set did not match the expected recipient or Vertex fee.");
    }
  } else {
    const token = request.token as Exclude<PaymentToken, "SOL">;
    const mint = getTokenMint(token, request.network === "devnet" ? "devnet" : "mainnet");
    const recipientAta = (
      await getAssociatedTokenAddress(mint, new PublicKey(recipient), true)
    ).toBase58();
    const treasuryAta = (
      await getAssociatedTokenAddress(mint, new PublicKey(treasury), true)
    ).toBase58();
    const requiredAmount = toAtomicUnits(request.amount, token);
    const requiredFee = toAtomicUnits(breakdown.platformFee, token);

    const recipientTransfer = instructions.some((instruction) => {
      if (!hasParsedInstruction(instruction)) return false;
      if (instruction.program !== "spl-token") return false;
      const destination = instruction.parsed?.info?.destination;
      const rawAmount =
        instruction.parsed?.info?.tokenAmount?.amount ||
        instruction.parsed?.info?.amount;

      return destination === recipientAta && Number(rawAmount) >= requiredAmount;
    });

    const feeTransfer =
      !breakdown.feeEnabled ||
      instructions.some((instruction) => {
        if (!hasParsedInstruction(instruction)) return false;
        if (instruction.program !== "spl-token") return false;
        const destination = instruction.parsed?.info?.destination;
        const rawAmount =
          instruction.parsed?.info?.tokenAmount?.amount ||
          instruction.parsed?.info?.amount;

        return destination === treasuryAta && Number(rawAmount) >= requiredFee;
      });

    if (!recipientTransfer || !feeTransfer) {
      throw new Error("The token transfer set did not match the expected recipient or Vertex fee.");
    }
  }

  const signatureStatus = await withRpcFallback("check-payment-finality", (connection) =>
    connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    })
  );

  const confirmation = signatureStatus.value[0]?.confirmationStatus;
  return confirmation === "finalized" ? "finalized" : "confirmed";
}

async function appendPaymentEvent(
  paymentRequest: PaymentRequestRow | null,
  invoice: InvoiceRow | null,
  eventType: string,
  details: Record<string, unknown>
) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin || (!paymentRequest && !invoice)) return;

  await supabaseAdmin.from("payment_events").insert({
    auth_user_id: paymentRequest?.auth_user_id ?? invoice?.auth_user_id ?? null,
    payment_request_id: paymentRequest?.id ?? null,
    invoice_id: invoice?.id ?? paymentRequest?.invoice_id ?? null,
    event_type: eventType,
    status: paymentRequest?.payment_status ?? invoice?.status ?? null,
    signature: typeof details.signature === "string" ? details.signature : null,
    details,
  });
}

async function syncFinality(paymentRequest: PaymentRequestRow, invoice: InvoiceRow | null) {
  if (!paymentRequest.signature) return paymentRequest;
  const signature = paymentRequest.signature;

  const statusResponse = await withRpcFallback("sync-payment-finality", (connection) =>
    connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    })
  );

  const confirmationStatus =
    statusResponse.value[0]?.confirmationStatus ?? paymentRequest.confirmation_status;
  if (confirmationStatus !== "finalized") {
    return paymentRequest;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return paymentRequest;

  const finalizedAt = paymentRequest.finalized_at || new Date().toISOString();
  await supabaseAdmin
    .from("payment_requests")
    .update({
      payment_status: "payment_finalized",
      confirmation_status: "finalized",
      finalized_at: finalizedAt,
    })
    .eq("id", paymentRequest.id);

  if (invoice?.id) {
    await supabaseAdmin
      .from("invoices")
      .update({
        status: "payment_finalized",
        verification_status: "finalized",
        finalized_at: finalizedAt,
        paid_at: invoice.paid_at || finalizedAt,
      })
      .eq("id", invoice.id);
  }

  await appendPaymentEvent(
    {
      ...paymentRequest,
      payment_status: "payment_finalized" as const,
      confirmation_status: "finalized" as const,
      finalized_at: finalizedAt,
      signature,
    },
    invoice,
    "payment_finalized",
    { signature }
  );

  return {
    ...paymentRequest,
    payment_status: "payment_finalized" as const,
    confirmation_status: "finalized" as const,
    finalized_at: finalizedAt,
    signature,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const request = decodePaymentRequest(id);

  if (!request) {
    return NextResponse.json({ error: "Invalid payment link." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  let invoice: InvoiceRow | null = null;
  let paymentRequest: PaymentRequestRow | null = null;

  if (supabaseAdmin) {
    const [{ data: invoiceData }, { data: paymentData }] = await Promise.all([
      supabaseAdmin
        .from("invoices")
        .select(
          "id, invoice_number, client_name, total, token, status, signature, tx_hash, auth_user_id, payment_id, network, recipient_wallet, failure_reason, paid_at, confirmed_at, finalized_at, created_at"
        )
        .eq("payment_id", id)
        .maybeSingle(),
      supabaseAdmin
        .from("payment_requests")
        .select(
          "id, auth_user_id, invoice_id, source, label, description, network, recipient_wallet, amount, token, memo, fee_bps, payment_status, signature, confirmation_status, confirmed_at, finalized_at, failure_reason, created_at"
        )
        .eq("id", id)
        .maybeSingle(),
    ]);

    invoice = (invoiceData as InvoiceRow | null) ?? null;
    paymentRequest = (paymentData as PaymentRequestRow | null) ?? null;

    if (invoice?.status === "sent") {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", invoice.id);
      invoice.status = "viewed";
    }

    if (
      paymentRequest?.signature &&
      paymentRequest.confirmation_status === "confirmed" &&
      !paymentRequest.finalized_at
    ) {
      paymentRequest = await syncFinality(paymentRequest, invoice);
    }
  }

  const lifecycle = paymentRequest
    ? {
        status: normalizePaymentStatus(
          paymentRequest.confirmation_status,
          paymentRequest.payment_status
        ),
        signature: paymentRequest.signature,
        confirmationStatus: paymentRequest.confirmation_status,
        confirmedAt: paymentRequest.confirmed_at,
        finalizedAt: paymentRequest.finalized_at,
        failureReason: paymentRequest.failure_reason,
      }
    : {
        status: mapLegacyInvoiceStatus(invoice?.status),
        signature: invoice?.tx_hash ?? null,
        confirmationStatus: null,
        confirmedAt: invoice?.confirmed_at ?? null,
        finalizedAt: invoice?.finalized_at ?? null,
        failureReason: invoice?.failure_reason ?? null,
      };

  return NextResponse.json({
    request,
    invoice,
    paymentRequest,
    lifecycle,
    breakdown: calculatePaymentBreakdown(request.amount),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const request = decodePaymentRequest(id);

  if (!request) {
    return NextResponse.json({ error: "Invalid payment link." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = (await req.json()) as { signature?: string };
  const SIG_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  if (!body.signature || !SIG_REGEX.test(body.signature)) {
    return NextResponse.json(
      { error: "Invalid transaction signature format." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  let invoice: InvoiceRow | null = null;
  let paymentRequest: PaymentRequestRow | null = null;

  if (supabaseAdmin) {
    const [{ data: invoiceData }, { data: paymentData }] = await Promise.all([
      supabaseAdmin
        .from("invoices")
        .select(
          "id, invoice_number, client_name, total, token, status, signature, tx_hash, auth_user_id, payment_id, network, recipient_wallet, failure_reason, paid_at, confirmed_at, finalized_at, created_at"
        )
        .eq("payment_id", id)
        .maybeSingle(),
      supabaseAdmin
        .from("payment_requests")
        .select(
          "id, auth_user_id, invoice_id, source, label, description, network, recipient_wallet, amount, token, memo, fee_bps, payment_status, signature, confirmation_status, confirmed_at, finalized_at, failure_reason, created_at"
        )
        .eq("id", id)
        .maybeSingle(),
    ]);
    invoice = (invoiceData as InvoiceRow | null) ?? null;
    paymentRequest = (paymentData as PaymentRequestRow | null) ?? null;
  }

  // --- Idempotency Check ---
  // If the exact same transaction signature has already been verified and is in a confirmed/finalized state,
  // we exit early to prevent duplicate processing, multiple webhook triggers, and redundant RPC calls.
  if (
    paymentRequest &&
    paymentRequest.signature === body.signature &&
    (paymentRequest.confirmation_status === "confirmed" || paymentRequest.confirmation_status === "finalized")
  ) {
    return NextResponse.json({
      success: true,
      signature: body.signature,
      status: paymentRequest.confirmation_status,
      pendingFinality: paymentRequest.confirmation_status !== "finalized",
    });
  }

  // Set payment_submitted before verification so the dashboard shows in-flight state.
  // Uses .neq filters to avoid downgrading an already-confirmed/finalized payment.
  if (supabaseAdmin && paymentRequest) {
    await supabaseAdmin
      .from("payment_requests")
      .update({ payment_status: "payment_submitted", signature: body.signature })
      .eq("id", id)
      .neq("payment_status", "payment_confirmed")
      .neq("payment_status", "payment_finalized");

    if (invoice) {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "payment_submitted" })
        .eq("id", invoice.id)
        .neq("status", "payment_confirmed")
        .neq("status", "payment_finalized");
    }

    const submittedRequest = {
      ...paymentRequest,
      payment_status: "payment_submitted",
      signature: body.signature,
    };
    await appendPaymentEvent(submittedRequest, invoice, "payment_submitted", {
      signature: body.signature,
    });
    paymentRequest = submittedRequest;
  }

  try {
    const verificationResult = await verifyTransaction(request, body.signature);
    const now = new Date().toISOString();
    const nextStatus =
      verificationResult === "finalized" ? "payment_finalized" : "payment_confirmed";

    if (supabaseAdmin) {
      if (paymentRequest) {
        await supabaseAdmin
          .from("payment_requests")
          .update({
            payment_status: nextStatus,
            signature: body.signature,
            confirmation_status: verificationResult,
            confirmed_at: now,
            finalized_at: verificationResult === "finalized" ? now : paymentRequest.finalized_at,
            failure_reason: null,
          })
          .eq("id", id);
      }

      if (invoice) {
        await supabaseAdmin
          .from("invoices")
          .update({
            status: nextStatus,
            tx_hash: body.signature,
            paid_at: now,
            verification_status: verificationResult,
            verified_at: now,
            confirmed_at: now,
            finalized_at: verificationResult === "finalized" ? now : invoice.finalized_at,
            failure_reason: null,
          })
          .eq("id", invoice.id);
      }
    }

    await appendPaymentEvent(paymentRequest, invoice, nextStatus, {
      signature: body.signature,
      confirmationStatus: verificationResult,
    });
    logVertexEvent("payment_verified", {
      paymentId: id,
      signature: body.signature,
      confirmationStatus: verificationResult,
    });

    return NextResponse.json({
      success: true,
      signature: body.signature,
      status: verificationResult === "finalized" ? "finalized" : "confirmed",
      pendingFinality: verificationResult !== "finalized",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vertex could not verify that transaction.";

    const isRetriable =
      error instanceof RetriableVerificationError;

    logVertexEvent(
      "payment_verification_failed",
      {
        paymentId: id,
        signature: body.signature,
        reason: message,
        retriable: isRetriable,
      },
      isRetriable ? "warn" : "error"
    );

    if (!isRetriable && supabaseAdmin) {
      if (paymentRequest) {
        await supabaseAdmin
          .from("payment_requests")
          .update({
            payment_status: "payment_failed",
            signature: body.signature,
            failure_reason: message,
          })
          .eq("id", id);
      }

      if (invoice) {
        await supabaseAdmin
          .from("invoices")
          .update({
            status: "payment_failed",
            tx_hash: body.signature,
            failure_reason: message,
          })
          .eq("id", invoice.id);
      }

      await appendPaymentEvent(paymentRequest, invoice, "payment_failed", {
        signature: body.signature,
        reason: message,
      });
    }

    return NextResponse.json(
      { error: message, retriable: isRetriable },
      { status: isRetriable ? 404 : 422 }
    );
  }
}
