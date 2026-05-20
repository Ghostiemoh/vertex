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

interface MappedSendError {
  code: "invalid_recipient" | "domain_not_verified" | "quota_exceeded" | "send_failed";
  userMessage: string;
  status: number;
}

// Resend reports errors via either a thrown exception or a `{ error }` field on the
// SDK return value. Both surface a `name` and `message`. We map the three failure
// modes the user actually sees (bad recipient, unverified sender domain, quota)
// to actionable copy so the invoice UI can show a real reason instead of a generic
// "failed to send".
function mapResendError(error: { name?: string; message?: string } | null | undefined): MappedSendError {
  const name = error?.name ?? "";
  const message = error?.message ?? "";

  if (
    name === "validation_error" ||
    /invalid.*(email|recipient|to[\s_-]?address)/i.test(message)
  ) {
    return {
      code: "invalid_recipient",
      userMessage: "The recipient email address looks invalid. Check it and try again.",
      status: 422,
    };
  }

  if (/domain.*(not[\s_-]?verified|unverified)|verify.*domain/i.test(message)) {
    return {
      code: "domain_not_verified",
      userMessage:
        "Vertex's sender domain is not verified with Resend yet. Notify support@vertex.cash so we can finish DNS setup.",
      status: 503,
    };
  }

  if (
    name === "rate_limit_exceeded" ||
    name === "daily_quota_exceeded" ||
    /quota|daily.?limit|rate.?limit/i.test(message)
  ) {
    return {
      code: "quota_exceeded",
      userMessage: "Email quota exhausted for now. Try again in a few minutes.",
      status: 429,
    };
  }

  return {
    code: "send_failed",
    userMessage: "Failed to send the invoice email. Please retry.",
    status: 502,
  };
}

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

    const result = await resend.emails.send({
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
    }) as { data?: unknown; error?: { name?: string; message?: string } | null } | undefined;

    if (result?.error) {
      const mapped = mapResendError(result.error);
      logVertexEvent(
        "email_send_failed",
        {
          reason: result.error.message ?? "unknown",
          providerName: result.error.name ?? null,
          mappedCode: mapped.code,
          clientEmail,
          invoiceNumber,
        },
        "error"
      );
      return NextResponse.json(
        { error: mapped.userMessage, code: mapped.code },
        { status: mapped.status }
      );
    }

    logVertexEvent("email_sent", { clientEmail, invoiceNumber });
    return NextResponse.json({ success: true, data: result?.data ?? null });
  } catch (error) {
    const mapped = mapResendError(
      error instanceof Error ? { name: error.name, message: error.message } : null
    );
    logVertexEvent(
      "email_send_failed",
      {
        reason: error instanceof Error ? error.message : "unknown",
        providerName: error instanceof Error ? error.name : null,
        mappedCode: mapped.code,
        clientEmail,
        invoiceNumber,
      },
      "error"
    );
    return NextResponse.json(
      { error: mapped.userMessage, code: mapped.code },
      { status: mapped.status }
    );
  }
}
