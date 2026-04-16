import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr
} from '@react-email/components';

interface InvoiceEmailProps {
  invoiceNumber: string;
  vendorName: string;
  clientName: string;
  total: number;
  token: string;
  paymentLink: string;
  notes?: string;
}

export default function InvoiceEmail({
  invoiceNumber = "INV-001",
  vendorName = "Vendor",
  clientName = "Client",
  total = 0,
  token = "USDC",
  paymentLink = "https://Vertex.vercel.app",
  notes = "",
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Invoice pending from {vendorName}</Heading>
          
          <Text style={text}>Hi {clientName},</Text>
          <Text style={text}>
            {vendorName} has sent you a new invoice (<strong>{invoiceNumber}</strong>) for <strong>{total} {token}</strong>.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={paymentLink}>
              Pay Invoice Securely
            </Button>
          </Section>

          {notes && (
            <Section style={notesSection}>
              <Text style={notesLabel}>Notes / Terms:</Text>
              <Text style={notesText}>{notes}</Text>
            </Section>
          )}

          <Hr style={hr} />
          
          <Text style={footer}>
            This invoice is powered by <strong>Vertex</strong>, the Surgical Payments Protocol. 
            The PDF copy is attached to this email for your records.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  border: '1px solid #eaeaea',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0',
  margin: '0 0 20px 0',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const buttonContainer = {
  padding: '24px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#00C853',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 24px',
};

const notesSection = {
  backgroundColor: '#f8fafc',
  padding: '16px',
  borderRadius: '6px',
  marginBottom: '24px',
};

const notesLabel = {
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
};

const notesText = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0 24px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
};
