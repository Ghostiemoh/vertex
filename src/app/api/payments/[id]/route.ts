import { NextResponse } from "next/server";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  calculatePaymentBreakdown,
  decodePaymentRequest,
  getTokenMint,
  paymentRequestFromRow,
  toAtomicUnits,
  type PaymentRequest,
  type PaymentToken,
} from "@/lib/payment-utils";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TREASURY_WALLET } from "@/lib/config";
import { logVertexEvent } from "@/lib/monitoring";
import { mapLegacyInvoiceStatus, type PaymentStatus } from "@/lib/payments";
import { withRpcFallback } from "@/lib/rpc";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { paymentVerifyPostSchema } from "@/lib/schemas";
import {
  hasParsedInstruction,
  matchesSplTokenTransfer,
} from "@/lib/spl-token-validation";

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


function normalizePaymentStatus(
  confirmationStatus: "processed" | "confirmed" | "finalized" | null,
  fallbackStatus: string | null | undefined
): PaymentStatus {
  if (confirmationStatus === "finalized") return "payment_finalized";
  if (confirmationStatus === "confirmed") return "payment_confirmed";
  return mapLegacyInvoiceStatus(fallbackStatus);
}

const VERIFY_RATE_WINDOW_MS = 60_000;
const VERIFY_RATE_LIMIT = 15;

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
    const expectedMint = mint.toBase58();
    const recipientAta = (
      await getAssociatedTokenAddress(mint, new PublicKey(recipient), true)
    ).toBase58();
    const treasuryAta = (
      await getAssociatedTokenAddress(mint, new PublicKey(treasury), true)
    ).toBase58();
    const requiredAmount = toAtomicUnits(request.amount, token);
    const requiredFee = toAtomicUnits(breakdown.platformFee, token);

    const mintMismatch = instructions.some((instruction) => {
      if (!hasParsedInstruction(instruction)) return false;
      if (instruction.program !== "spl-token") return false;
      const destination = instruction.parsed?.info?.destination;
      if (destination !== recipientAta && destination !== treasuryAta) return false;
      return !matchesSplTokenTransfer(instruction, { expectedMint, expectedDestination: destination, minAmount: 0 });
    });

    if (mintMismatch) {
      throw new Error("The transaction transferred a token that did not match the requested mint.");
    }

    const recipientTransfer = instructions.some((instruction) =>
      matchesSplTokenTransfer(instruction, {
        expectedMint,
        expectedDestination: recipientAta,
        minAmount: requiredAmount,
      })
    );

    const feeTransfer =
      !breakdown.feeEnabled ||
      instructions.some((instruction) =>
        matchesSplTokenTransfer(instruction, {
          expectedMint,
          expectedDestination: treasuryAta,
          minAmount: requiredFee,
        })
      );

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

  const signature = typeof details.signature === "string" ? details.signature : null;
  const { error } = await supabaseAdmin.from("payment_events").insert({
    auth_user_id: paymentRequest?.auth_user_id ?? invoice?.auth_user_id ?? null,
    payment_request_id: paymentRequest?.id ?? null,
    invoice_id: invoice?.id ?? paymentRequest?.invoice_id ?? null,
    event_type: eventType,
    status: paymentRequest?.payment_status ?? invoice?.status ?? null,
    signature,
    details,
  });

  if (!error) return;

  // 23505 = postgres unique_violation. The idx_payment_events_unique_per_signature
  // partial index guarantees a single row per (payment_request_id, signature, event_type),
  // so the conflict means this exact event was already recorded — we keep the existing
  // row's lifecycle state and treat the duplicate write as a no-op.
  if (error.code === "23505") {
    logVertexEvent(
      "payment_event_duplicate",
      {
        eventType,
        paymentRequestId: paymentRequest?.id ?? null,
        invoiceId: invoice?.id ?? null,
        signature,
      },
      "warn"
    );
    return;
  }

  // Any other DB failure must not propagate — verify and webhook paths depend on
  // appendPaymentEvent being side-effect-only and never throwing.
  logVertexEvent(
    "payment_event_insert_failed",
    {
      eventType,
      code: error.code ?? null,
      message: error.message,
      paymentRequestId: paymentRequest?.id ?? null,
      invoiceId: invoice?.id ?? null,
      signature,
    },
    "error"
  );
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

  // Prefer the DB row when available (short-ID URLs); fall back to decoding the
  // legacy base64-encoded payload so direct /get-paid links and pre-short-ID
  // invoice URLs keep resolving.
  const request: PaymentRequest | null = paymentRequest
    ? paymentRequestFromRow(paymentRequest, id)
    : decodePaymentRequest(id);

  if (!request) {
    return NextResponse.json({ error: "Invalid payment link." }, { status: 400 });
  }

  if (supabaseAdmin) {
    if (invoice?.status === "sent") {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", invoice.id);
      invoice.status = "viewed";

      await appendPaymentEvent(paymentRequest, invoice, "invoice_viewed", {
        viewedAt: new Date().toISOString()
      });
    }

    if (
      paymentRequest?.signature &&
      paymentRequest.confirmation_status === "confirmed" &&
      !paymentRequest.finalized_at
    ) {
      paymentRequest = await syncFinality(paymentRequest, invoice);
    }
  }

  let events: {
    id: string;
    event_type: string;
    status: string | null;
    signature: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
  }[] = [];
  if (supabaseAdmin) {
    const eventQuery = supabaseAdmin
      .from("payment_events")
      .select("id, event_type, status, signature, details, created_at");

    if (paymentRequest && invoice) {
      eventQuery.or(`payment_request_id.eq.${id},invoice_id.eq.${invoice.id}`);
    } else if (paymentRequest) {
      eventQuery.eq("payment_request_id", id);
    } else if (invoice) {
      eventQuery.eq("invoice_id", invoice.id);
    } else {
      eventQuery.eq("payment_request_id", id);
    }

    const { data: eventsData } = await eventQuery.order("created_at", { ascending: true });
    events = (eventsData as typeof events) || [];
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
    events,
    breakdown: calculatePaymentBreakdown(request.amount),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ip = extractClientIp(req);
  const rate = checkRateLimit({
    key: `verify-payment:${ip}`,
    limit: VERIFY_RATE_LIMIT,
    windowMs: VERIFY_RATE_WINDOW_MS,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString() },
      }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = paymentVerifyPostSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const body = parsed.data;

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

  // Same DB-first / decode-fallback resolution as GET. Doing it after the rate
  // limit + Zod check keeps unauthenticated bad payloads from hitting the DB.
  const request: PaymentRequest | null = paymentRequest
    ? paymentRequestFromRow(paymentRequest, id)
    : decodePaymentRequest(id);

  if (!request) {
    return NextResponse.json({ error: "Invalid payment link." }, { status: 400 });
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

  // --- Signature reuse guard ---
  // Reject signatures that have already settled a *different* payment request.
  if (supabaseAdmin) {
    const { data: claimedBy } = await supabaseAdmin
      .from("payment_requests")
      .select("id")
      .eq("signature", body.signature)
      .neq("id", id)
      .maybeSingle();
    if (claimedBy) {
      return NextResponse.json(
        { error: "Transaction signature already used by another payment request." },
        { status: 409 }
      );
    }
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
