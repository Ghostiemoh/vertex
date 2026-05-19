import { NextResponse } from "next/server";
import { Resend } from "resend";
import InvoiceEmail from "@/components/emails/InvoiceTemplate";
import { logVertexEvent } from "@/lib/monitoring";
import { SITE_URL } from "@/lib/config";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { sendInvoiceSchema } from "@/lib/schemas";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const SEND_INVOICE_RATE_LIMIT = 5;
const SEND_INVOICE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function buildAllowedOrigins(): string[] {
  return [
    SITE_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ];
}

function isAllowedOrigin(req: Request): boolean {
  const allowed = buildAllowedOrigins();
  const origin = req.headers.get("origin");
  if (origin && allowed.includes(origin)) return true;

  // Some browsers omit Origin on same-origin POSTs; fall back to Referer.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowed.includes(refererOrigin)) return true;
    } catch {
      // Malformed referer — treat as untrusted.
    }
  }

  return false;
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    logVertexEvent("email_send_blocked", {
      reason: "origin_not_allowed",
      origin: req.headers.get("origin") ?? null,
      referer: req.headers.get("referer") ?? null,
    }, "warn");
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const ip = extractClientIp(req);
  const rate = checkRateLimit({
    key: `send-invoice:${ip}`,
    limit: SEND_INVOICE_RATE_LIMIT,
    windowMs: SEND_INVOICE_RATE_WINDOW_MS,
  });
  if (!rate.allowed) {
    logVertexEvent("email_send_blocked", { reason: "rate_limited", ip }, "warn");
    return NextResponse.json(
      { error: "Too many invoice emails sent recently. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString() },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = sendInvoiceSchema.safeParse(body);
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

  const {
    clientEmail,
    pdfBase64,
    invoiceNumber,
    vendorName,
    clientName,
    total,
    token,
    paymentLink,
    notes,
  } = parsed.data;

  if (!resend) {
    logVertexEvent("email_send_failed", { reason: "missing_resend_api_key" }, "error");
    return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
  }

  if (!resendFromEmail) {
    logVertexEvent("email_send_failed", { reason: "missing_resend_from_email" }, "error");
    return NextResponse.json({ error: "Verified sender email is not configured." }, { status: 503 });
  }

  try {
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    const data = await resend.emails.send({
      from: resendFromEmail,
      to: [clientEmail],
      subject: `New Invoice ${invoiceNumber} from ${vendorName}`,
      react: InvoiceEmail({
        invoiceNumber,
        vendorName,
        clientName,
        total,
        token,
        paymentLink,
        notes,
      }) as React.ReactElement,
      attachments: [
        {
          filename: `Invoice_${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    logVertexEvent("email_sent", { clientEmail, invoiceNumber });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logVertexEvent(
      "email_send_failed",
      { reason: error instanceof Error ? error.message : "unknown" },
      "error"
    );
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
