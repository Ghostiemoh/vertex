import { NextResponse } from "next/server";
import {
  Connection,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  calculatePaymentBreakdown,
  decodePaymentRequest,
  getTokenDecimals,
  getTokenMint,
  type PaymentRequest,
  type PaymentToken,
} from "@/lib/payment-utils";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  IS_DEVNET,
  VERTEX_NETWORK,
  TREASURY_WALLET,
} from "@/lib/config";

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(VERTEX_NETWORK),
  "confirmed"
);

function hasParsedInstruction(
  instruction: ParsedInstruction | PartiallyDecodedInstruction
): instruction is ParsedInstruction {
  return "parsed" in instruction;
}

async function verifyTransaction(
  request: PaymentRequest,
  signature: string
): Promise<boolean> {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!tx || tx.meta?.err) return false;

  const instructions = tx.transaction.message.instructions;
  const recipient = request.recipient;
  const treasury = TREASURY_WALLET;
  const breakdown = calculatePaymentBreakdown(request.amount);

  if (request.token === "SOL") {
    const lamports = Math.round(request.amount * 1_000_000_000);
    const feeLamports = Math.round(breakdown.platformFee * 1_000_000_000);

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

    return recipientTransfer && feeTransfer;
  }

  const token = request.token as Exclude<PaymentToken, "SOL">;
  const mint = getTokenMint(token, IS_DEVNET ? "devnet" : "mainnet");
  const recipientAta = (
    await getAssociatedTokenAddress(mint, new PublicKey(recipient), true)
  ).toBase58();
  const treasuryAta = (
    await getAssociatedTokenAddress(mint, new PublicKey(treasury), true)
  ).toBase58();
  const unit = 10 ** getTokenDecimals(request.token);
  const requiredAmount = Math.round(request.amount * unit);
  const requiredFee = Math.round(breakdown.platformFee * unit);

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

  return recipientTransfer && feeTransfer;
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
  let invoice: Record<string, unknown> | null = null;

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("invoices")
      .select(
        "id, invoice_number, client_name, total, token, status, signature, tx_hash, created_at"
      )
      .eq("payment_id", id)
      .maybeSingle();

    invoice = data;

    if (data?.status === "sent") {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("payment_id", id);
    }
  }

  return NextResponse.json({
    request,
    invoice,
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

  const body = (await req.json()) as { signature?: string };
  if (!body.signature) {
    return NextResponse.json(
      { error: "Transaction signature is required." },
      { status: 400 }
    );
  }

  const verified = await verifyTransaction(request, body.signature);
  if (!verified) {
    return NextResponse.json(
      { error: "Vertex could not verify that transaction." },
      { status: 422 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    await supabaseAdmin
      .from("invoices")
      .update({
        status: "paid",
        tx_hash: body.signature,
        paid_at: new Date().toISOString(),
        verification_status: "confirmed",
        verified_at: new Date().toISOString(),
      })
      .eq("payment_id", id);
  }

  return NextResponse.json({ success: true, signature: body.signature });
}
