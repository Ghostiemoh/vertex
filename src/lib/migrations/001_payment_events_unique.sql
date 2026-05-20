-- Migration: 001 — payment_events idempotency guard
-- Date: 2026-05-20
-- Linked: founder-os fa3 / fa4
--
-- Why: appendPaymentEvent() runs on every verify roundtrip and any webhook retry.
-- Without a uniqueness guard the same lifecycle event is written multiple times
-- (and downstream consumers fire multiple times). The founder-os plan listed the
-- key as (payment_request_id, signature) — but the lifecycle deliberately writes
-- up to 3 rows sharing the same signature: payment_submitted, payment_confirmed,
-- payment_finalized. The corrected key includes event_type, and is partial on
-- (signature IS NOT NULL) so null-signature events (invoice_viewed, request_created)
-- still flow freely.
--
-- How to apply: paste into Supabase SQL Editor against the production database.
-- Safe to re-run: the index uses IF NOT EXISTS and the dedupe step is idempotent.

BEGIN;

-- 1. Collapse any pre-existing duplicates, keeping the earliest row per key.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY payment_request_id, signature, event_type
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.payment_events
  WHERE signature IS NOT NULL
)
DELETE FROM public.payment_events
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Enforce uniqueness for every future insert.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_unique_per_signature
  ON public.payment_events (payment_request_id, signature, event_type)
  WHERE signature IS NOT NULL;

COMMIT;
