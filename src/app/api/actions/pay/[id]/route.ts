import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import {
  Connection,
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
  getTokenDecimals,
  getTokenMint,
  type PaymentToken,
} from "@/lib/payment-utils";
import {
  DEFAULT_RPC_ENDPOINT,
  NETWORK_LABEL,
  PLATFORM_FEE_ENABLED,
  TREASURY_WALLET,
} from "@/lib/config";
import { getOrigin } from "@/lib/utils";

const connection = new Connection(DEFAULT_RPC_ENDPOINT, "confirmed");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentReq = decodePaymentRequest(id);

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
    const body: ActionPostRequest = await req.json();
    const payerPubkey = new PublicKey(body.account);
    const request = decodePaymentRequest(id);

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
    const latestBlockhash = await connection.getLatestBlockhash();

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
          lamports: Math.round(request.amount * 1_000_000_000),
        })
      );

      if (PLATFORM_FEE_ENABLED && breakdown.platformFee > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: payerPubkey,
            toPubkey: treasuryPubkey,
            lamports: Math.round(breakdown.platformFee * 1_000_000_000),
          })
        );
      }
    } else {
      const tokenType = request.token as Exclude<PaymentToken, "SOL">;
      const mintPubkey = getTokenMint(tokenType, request.network === "devnet" ? "devnet" : "mainnet");
      const decimals = getTokenDecimals(request.token);
      const senderAta = await getAssociatedTokenAddress(mintPubkey, payerPubkey);
      const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

      try {
        await getAccount(connection, recipientAta);
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
            Math.round(breakdown.platformFee * 10 ** decimals)
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
