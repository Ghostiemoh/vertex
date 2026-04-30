import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import InvoiceEmail from '@/components/emails/InvoiceTemplate';
import { logVertexEvent } from "@/lib/monitoring";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      clientEmail, 
      pdfBase64, 
      invoiceNumber, 
      vendorName, 
      clientName, 
      total, 
      token, 
      paymentLink, 
      notes 
    } = body;

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client email is required' }, { status: 400 });
    }

    if (!resend) {
      logVertexEvent("email_send_failed", { reason: "missing_resend_api_key" }, "error");
      return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 });
    }

    if (!resendFromEmail) {
      logVertexEvent("email_send_failed", { reason: "missing_resend_from_email" }, "error");
      return NextResponse.json({ error: 'Verified sender email is not configured.' }, { status: 503 });
    }

    // Convert base64 PDF back to buffer for email attachment
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

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
        notes
      }) as React.ReactElement,
      attachments: [
        {
          filename: `Invoice_${invoiceNumber}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    logVertexEvent("email_sent", {
      clientEmail,
      invoiceNumber,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Email sending failed:', error);
    logVertexEvent("email_send_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    }, "error");
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
