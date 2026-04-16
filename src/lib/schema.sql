-- VERTEX DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to initialize or migrate the backend.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT UNIQUE NOT NULL,
  business_name TEXT,
  business_address TEXT,
  tax_id TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_address TEXT REFERENCES public.profiles(address) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  address TEXT,
  wallet_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_address TEXT REFERENCES public.profiles(address) ON DELETE CASCADE,
  invoice_number TEXT,
  client_name TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total DECIMAL NOT NULL,
  token TEXT DEFAULT 'SOL',
  due_date DATE,
  status TEXT DEFAULT 'draft',
  payment_id TEXT UNIQUE,
  payment_payload JSONB,
  tx_hash TEXT,
  signature TEXT,
  verification_status TEXT DEFAULT 'unverified',
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Contracts
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_address TEXT REFERENCES public.profiles(address) ON DELETE CASCADE,
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Users manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public can read invoice by payment_id" ON public.invoices;
DROP POLICY IF EXISTS "Public can update invoice payment status" ON public.invoices;
DROP POLICY IF EXISTS "Users manage own contracts" ON public.contracts;

CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users manage own clients"
  ON public.clients FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON public.clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_auth_user_id ON public.invoices(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_contracts_auth_user_id ON public.contracts(auth_user_id);
