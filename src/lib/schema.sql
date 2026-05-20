-- VERTEX DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to initialize or migrate the backend.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT UNIQUE NOT NULL,
  business_name TEXT,
  business_address TEXT,
  tax_id TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  address TEXT,
  wallet_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id TEXT PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'direct',
  invoice_id UUID,
  label TEXT,
  description TEXT,
  network TEXT NOT NULL DEFAULT 'devnet',
  recipient_wallet TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  token TEXT NOT NULL DEFAULT 'SOL',
  memo TEXT,
  fee_bps INTEGER NOT NULL DEFAULT 10,
  payment_status TEXT NOT NULL DEFAULT 'sent',
  signature TEXT,
  confirmation_status TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT,
  client_name TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total DECIMAL NOT NULL,
  token TEXT DEFAULT 'SOL',
  due_date DATE,
  status TEXT DEFAULT 'draft',
  payment_id TEXT UNIQUE REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  payment_payload JSONB,
  network TEXT DEFAULT 'devnet',
  recipient_wallet TEXT,
  tx_hash TEXT,
  signature TEXT,
  verification_status TEXT DEFAULT 'unverified',
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  project_name TEXT NOT NULL,
  scope TEXT,
  amount DECIMAL,
  token TEXT DEFAULT 'SOL',
  due_date DATE,
  status TEXT DEFAULT 'draft',
  signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_request_id TEXT REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  status TEXT,
  signature TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Users manage own payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Users manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users manage own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users view own payment events" ON public.payment_events;

CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users manage own clients"
  ON public.clients FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users manage own payment requests"
  ON public.payment_requests FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users manage own invoices"
  ON public.invoices FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users manage own contracts"
  ON public.contracts FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users view own payment events"
  ON public.payment_events FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON public.clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_auth_user_id ON public.payment_requests(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_invoice_id ON public.payment_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_auth_user_id ON public.invoices(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_contracts_auth_user_id ON public.contracts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_request_id ON public.payment_events(payment_request_id);

-- Idempotency guard: prevents duplicate lifecycle events on retry. See migrations/001_payment_events_unique.sql for the rationale.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_unique_per_signature
  ON public.payment_events (payment_request_id, signature, event_type)
  WHERE signature IS NOT NULL;
