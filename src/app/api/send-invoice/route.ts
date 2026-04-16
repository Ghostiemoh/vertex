import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import InvoiceEmail from '@/components/emails/InvoiceTemplate';

const resendApiKey = process.env.RESEND_API_KEY;
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
      // Mock mode if no RESEND_API_KEY
      console.log(`\n========================================`);
      console.log(`[MOCK EMAIL SENT TO ${clientEmail}]`);
      console.log(`Link: ${paymentLink}`);
      console.log(`PDF size: ${pdfBase64?.length} bytes`);
      console.log(`Set RESEND_API_KEY in .env.local to send real emails.`);
      console.log(`========================================\n`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return NextResponse.json({ success: true, mocked: true });
    }

    // Convert base64 PDF back to buffer for email attachment
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const data = await resend.emails.send({
      from: 'Vertex Billing <onboarding@resend.dev>', // Use resend demo domain unless verified
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

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Email sending failed:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
