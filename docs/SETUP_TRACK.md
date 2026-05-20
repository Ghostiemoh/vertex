# Vertex · Infrastructure & Setup Track

Owner: Muhammad
Source of truth: founder-os.html — "Infrastructure · Setup Track" + "Brand & Social · Setup Track"
Status as of: 2026-05-20

This is the punch list of things **only you can do** (accounts, payments, DNS).
For each item: do the manual step, then drop the credentials/keys back to me and I'll wire the code.

---

## 1 · Domain + DNS  (blocks everything below)

- [ ] Register **vertex.cash** (primary). If unavailable, fall back to `vertex.io` then `vertex.so`.
      - Namecheap or Cloudflare Registrar. Cloudflare is ~$2/yr cheaper and DNS lives in the same dashboard.
- [ ] Move DNS to **Cloudflare** (free tier).
- [ ] Add these records once domain is live:
      - `A`     `@`       → Vercel IP (Vercel will give you this when you connect the domain)
      - `CNAME` `www`     → `cname.vercel-dns.com`
      - `CNAME` `status`  → status page provider (see §5)
- [ ] Connect domain to Vercel project (Project Settings → Domains → Add).

→ When done: send me the production domain so I can update `getOrigin()`, `next.config`, and email From: headers.

---

## 2 · Google Workspace + Email Domain

- [ ] Sign up at workspace.google.com using `vertex.cash`. Business Starter ($7/user/mo) is enough.
- [ ] Create these inboxes:
      - `muhammad@vertex.cash`   — personal / founder
      - `hello@vertex.cash`      — general inbound
      - `support@vertex.cash`    — invoice / payment support
      - `security@vertex.cash`   — vuln reports, dot-files in `.well-known/security.txt`
      - `noreply@vertex.cash`    — Resend From: address
- [ ] Verify the domain (Workspace will give you a TXT record → add it in Cloudflare).

→ When done: I'll wire `noreply@vertex.cash` into the Resend setup and add a `security.txt`.

---

## 3 · Email Authentication (DKIM / SPF / DMARC)

All three are TXT records in Cloudflare DNS. **Do this only after §2.**

- [ ] **SPF**   — `v=spf1 include:_spf.google.com include:resend.com ~all`  (host: `@`)
- [ ] **DKIM**  — Google Workspace will generate the selector + key once you click Authenticate Email in the admin console. Resend will give you a second DKIM record (`resend._domainkey`). Add both.
- [ ] **DMARC** — `v=DMARC1; p=quarantine; rua=mailto:security@vertex.cash; pct=100`  (host: `_dmarc`)

→ Verify with [mxtoolbox.com](https://mxtoolbox.com/SuperTool.aspx) — all three should pass.

---

## 4 · PostHog (product analytics — 8 funnel events)

- [ ] Sign up at [posthog.com](https://posthog.com) (free tier covers us for now).
- [ ] Create a project named `vertex-prod`.
- [ ] Copy the **Project API Key** and **Host URL**.

→ Send me both. I'll then wire:
- `posthog-js` provider in `app/layout.tsx`
- 8 funnel events: `wallet_connected`, `invoice_created`, `invoice_sent`, `payment_link_copied`, `pay_page_viewed`, `payment_submitted`, `payment_confirmed`, `payment_finalized`
- Funnel dashboard config (I'll send the JSON to import)

---

## 5 · Status Page (status.vertex.cash)

- [ ] Pick one (in order of preference):
      1. **[Better Stack](https://betterstack.com/uptime)** — free tier, beautiful, owns the status page + uptime monitoring.
      2. [Statuspage by Atlassian](https://www.atlassian.com/software/statuspage) — overkill but classic.
      3. [Instatus](https://instatus.com) — also good.
- [ ] Add HTTP checks for: `/` (homepage), `/api/payments/[stub]` (health), `/dashboard` (auth-gated 200 or 302).
- [ ] Map `status.vertex.cash` to whichever provider you pick (CNAME).

→ When live: send me the URL so I can add a footer link.

---

## 6 · Sentry (client + server errors)

- [ ] Sign up at [sentry.io](https://sentry.io) — Developer tier free.
- [ ] Create an organization `vertex` and a Next.js project.
- [ ] Copy the **DSN** and the **Auth Token** (for source map uploads).

→ Send me both. I'll wire:
- `@sentry/nextjs` SDK with `instrumentation.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`
- Source map upload via the Sentry Vercel integration
- Replace the existing `logVertexEvent` `console.error` path with a Sentry capture for `level: error`

---

## 7 · Plausible (marketing analytics)

- [ ] Sign up at [plausible.io](https://plausible.io) — $9/mo. Or self-host with [Umami](https://umami.is) on Vercel for free.
- [ ] Add `vertex.cash` as a site.

→ Send me the script tag. I'll add it to `app/layout.tsx` behind a `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env var so it only loads in production.

---

## Brand & Social — adjacent track

These don't block code work but should land the same week.

- [ ] Create `@vertexcash` (or closest match) on **X** — bio: "Surgical point of finality. On-chain invoices on Solana."
- [ ] Same handle on **Farcaster**.
- [ ] LinkedIn company page → admin: muhammad@vertex.cash.
- [ ] Create the OG image (1200×630) — I can generate this once domain is set.
- [ ] Favicon set (16, 32, 180 Apple, 192/512 PWA) — I can generate from a single SVG.

---

## Daily rhythm

Treat sections 1→7 as a sequenced unlock, not parallel work.
Domain (§1) unblocks Workspace (§2), which unblocks DKIM (§3), which unblocks reliable email-driven funnels.
PostHog (§4) and Sentry (§6) can land in parallel since they're independent of email.

When you finish a section, paste the credentials/keys back and I'll wire the code the same session.
