import {
  ActionGetResponse,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import { blinkActionPostSchema } from "@/lib/schemas";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  calculatePaymentBreakdown,
  decodePaymentRequest,
  getPaymentUrl,
  getTokenMint,
  paymentRequestFromRow,
  toAtomicUnits,
  type PaymentRequest,
  type PaymentToken,
} from "@/lib/payment-utils";
import {
  NETWORK_LABEL,
  PLATFORM_FEE_ENABLED,
  TREASURY_WALLET,
} from "@/lib/config";
import { getOrigin } from "@/lib/utils";
import { withRpcFallback } from "@/lib/rpc";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Resolve a /pay/[id] slug to a PaymentRequest. Prefers a payment_requests DB
// row (short-ID URLs); falls back to decoding the legacy base64 payload so old
// invoice links and /get-paid direct links keep working.
async function resolvePaymentRequest(id: string): Promise<PaymentRequest | null> {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("payment_requests")
      .select("network, recipient_wallet, amount, token, description, label, memo, invoice_id")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      return paymentRequestFromRow(data, id);
    }
  }
  return decodePaymentRequest(id);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentReq = await resolvePaymentRequest(id);

    if (!paymentReq) {
      return Response.json(
        { message: "Invalid payment link" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const breakdown = calculatePaymentBreakdown(paymentReq.amount);
    const origin = getOrigin();
    const actionUrl = getPaymentUrl(origin, id);
    const description = [
      paymentReq.description || "Pay this Vertex invoice or payment request.",
      `Network: ${NETWORK_LABEL}`,
      `Recipient amount: ${paymentReq.amount} ${paymentReq.token}`,
      breakdown.feeEnabled
        ? `Vertex fee: ${breakdown.platformFee.toFixed(
            paymentReq.token === "SOL" ? 4 : 2
          )} ${paymentReq.token}`
        : "Vertex fee: none",
      `Open payment page: ${actionUrl}`,
    ].join("\n");

    const payload: ActionGetResponse = {
      icon: `${origin}/action-icon.png`,
      title: `Pay ${paymentReq.amount} ${paymentReq.token} with Vertex`,
      description,
      label: "Review payment",
    };

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
  } catch {
    return Response.json(
      { message: "Failed to load payment action." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = async () =>
  Response.json(null, { headers: ACTIONS_CORS_HEADERS });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return Response.json(
        { message: "Invalid JSON payload" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const parsedBody = blinkActionPostSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return Response.json(
        {
          message: parsedBody.error.issues[0]?.message ?? "Invalid Action payload",
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const payerPubkey = new PublicKey(parsedBody.data.account);
    const request = await resolvePaymentRequest(id);

    if (!request) {
      return Response.json(
        { message: "Invalid payment link" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const recipientPubkey = new PublicKey(request.recipient);
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    const breakdown = calculatePaymentBreakdown(request.amount);
    const transaction = new Transaction();
    const latestBlockhash = await withRpcFallback("action-blockhash", (connection) =>
      connection.getLatestBlockhash("confirmed")
    );

    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = payerPubkey;

    if (request.memo) {
      transaction.add(
        new TransactionInstruction({
          keys: [{ pubkey: payerPubkey, isSigner: true, isWritable: false }],
          data: Buffer.from(request.memo, "utf-8"),
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        })
      );
    }

    if (request.token === "SOL") {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payerPubkey,
          toPubkey: recipientPubkey,
          lamports: toAtomicUnits(request.amount, "SOL"),
        })
      );

      if (PLATFORM_FEE_ENABLED && breakdown.platformFee > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: payerPubkey,
            toPubkey: treasuryPubkey,
            lamports: toAtomicUnits(breakdown.platformFee, "SOL"),
          })
        );
      }
    } else {
      const tokenType = request.token as Exclude<PaymentToken, "SOL">;
      const mintPubkey = getTokenMint(tokenType, request.network === "devnet" ? "devnet" : "mainnet");
      const senderAta = await getAssociatedTokenAddress(mintPubkey, payerPubkey);
      const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

      try {
        await withRpcFallback("recipient-ata-check", (connection) =>
          getAccount(connection, recipientAta)
        );
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            payerPubkey,
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
          payerPubkey,
          toAtomicUnits(request.amount, tokenType)
        )
      );

      if (PLATFORM_FEE_ENABLED && breakdown.platformFee > 0) {
        const treasuryAta = await getAssociatedTokenAddress(mintPubkey, treasuryPubkey);
        try {
          await withRpcFallback("treasury-ata-check", (connection) =>
            getAccount(connection, treasuryAta)
          );
        } catch {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              payerPubkey,
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
            payerPubkey,
            toAtomicUnits(breakdown.platformFee, tokenType)
          )
        );
      }
    }

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: breakdown.feeEnabled
          ? `You are paying ${request.amount} ${request.token} plus a ${breakdown.platformFee.toFixed(
              request.token === "SOL" ? 4 : 2
            )} ${request.token} Vertex fee.`
          : `You are paying ${request.amount} ${request.token}.`,
      },
    });

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "An error occurred constructing the payment payload." },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
