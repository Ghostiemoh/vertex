# Vertex — Founder Operating System

> The complete A-to-Z execution playbook. Open this every morning. Close it every night.

**System date:** 2026-05-18 (Monday)
**Founder:** Muhammad Auwal Abdulaziz ([@Ghostiemoh](https://x.com/Ghostiemoh))
**Product:** [vertex-pay.vercel.app](https://vertex-pay.vercel.app)
**Thesis:** The Surgical Point of Finality — professional settlement layer for Solana freelancers.

> 📊 **Live dashboard view:** [Open `founder-os.html`](./founder-os.html) — visual cockpit, auto-marks today / current phase / current week, persists your checklist progress.

**Related docs:** [ROADMAP.md](./ROADMAP.md) · [DAPP_CHECKLIST.md](./DAPP_CHECKLIST.md) · [brand.md](./brand.md) · [FOUNDER_CONTEXT.md](./FOUNDER_CONTEXT.md)

---

## 0. How to Use This Document

**Every morning (7 min):**
1. Open this file.
2. Read **Section 1 — Today's Standing Orders** (below).
3. Check the **current week's milestone** in Section 22.
4. Pick today's 3 priority tasks from the active phase backlog.
5. Open one of: terminal, X drafts, Supabase dashboard. Go.

**Every Sunday (45 min):**
1. Run Section 21 — Weekly Review.
2. Update the KPI table in Section 19.
3. Promote / demote / kill tasks in this doc.
4. Schedule the week's content (Section 12) and outreach (Section 16).

**Every month (2 hours):**
1. Publish the monthly update (Section 23).
2. Re-rank risks (Section 25).
3. Adjust monetization experiments (Section 14).

---

## 1. Today's Standing Orders

These are non-negotiable defaults that apply every working day until renegotiated.

| # | Rule | Reason |
|---|------|--------|
| 1 | Ship **one user-visible improvement** and **one reliability improvement** every day | Compounding trust > sporadic launches |
| 2 | Post **at least one piece of content** on X before 11am | Distribution is half the product |
| 3 | Send **at least one cold DM or warm outreach** to a potential beta freelancer | Pipelines die in silence |
| 4 | Run `npm run lint && npm run test && npm run build` before every commit | Green CI is a brand asset |
| 5 | Never deploy to mainnet on Friday or after 6pm WAT | Operator presence required during finality changes |
| 6 | Every interactable element gets `cursor: pointer`; every motion uses spring physics | Antigravity standard |
| 7 | Log **today's volume + active freelancers** in the KPI sheet at end of day | What you don't measure decays |

---

## 2. The Five Phases (Calendar-Aligned)

| Phase | Window | Theme | Exit Criterion |
|-------|--------|-------|----------------|
| **P1 — Surgical Reliability** | May 18 – May 31 | Bugs, verification, lifecycle states | Payment finalizes end-to-end with zero manual DB edits |
| **P2 — Invoice Workflow Polish** | Jun 1 – Jun 14 | UX hardening, validation, client mgmt | Freelancer can invoice in <2 min from saved client |
| **P3 — Contract→Invoice Linking** | Jun 15 – Jun 30 | Agreement-to-settlement system | Contract drafted, signed, exported, invoiced, paid |
| **P4 — Mainnet Readiness** | Jul 1 – Jul 14 | Security, rate limits, monitoring, legal | Operator runbook complete, audits clean, RLS verified |
| **P5 — Private Beta** | Jul 15 – Aug 15 | 10 freelancers, $5K volume | 80% link finalize w/o founder help, 3 repeat users |
| **P6 — Growth & Monetization** | Aug 16 – Sep 30 | Recurring billing, fees, partnerships | First $1 of revenue captured, defensible workflow depth |

Detailed shippable scope per phase: see [ROADMAP.md](./ROADMAP.md).

---

## 3. Phase 0 — Stabilization Backlog (Run in Parallel with P1)

These are the bugs, polish items, and known gaps to clear *now*. Treat as a continuous backlog — pull from the top.

### 3.1 Bug / Reliability (Tier 1 — must clear by May 31)
- [ ] **Verification idempotency**: repeated POSTs to `/api/payments/verify` must not double-write `payment_events`
- [ ] **Status drift**: dashboard totals currently include non-finalized payments — restrict to `status = 'finalized'`
- [ ] **RPC failover**: confirm Helius primary + public RPC fallback, log every retry attempt
- [ ] **Token mint mismatch**: USDC devnet vs USDC mainnet mint addresses validated server-side
- [ ] **Memo validation**: enforce expected memo string; reject on missing or malformed
- [ ] **Wallet disconnect mid-flow**: gracefully reset invoice/payment UI, no orphan state
- [ ] **Email send failures**: surface error to user, allow retry, record attempt count
- [ ] **PDF metadata**: ensure tx signature, network, finality status all embedded
- [ ] **CSRF / origin checks** on `/api/email-invoice`
- [ ] **Race condition**: invoice created → email sent → status updated; verify ordering

### 3.2 UX Polish (Tier 2 — clear by Jun 14)
- [ ] Empty states for: no invoices, no clients, no contracts, no payments
- [ ] Loading skeletons (not spinners) for dashboard cards
- [ ] Form validation error messages match brand voice (terse, technical)
- [ ] `cursor: pointer` audit across every clickable surface
- [ ] Spring physics on every modal, card hover, page transition (Antigravity standard)
- [ ] Mobile responsiveness pass on invoice builder + payment link
- [ ] Sandbox / Production label is unmissable on every payment surface
- [ ] Toast system: success, error, info, on-chain confirmation — all distinct
- [ ] Keyboard navigation (Tab, Enter, Esc) on every form
- [ ] Lighthouse: LCP < 1s, CLS < 0.05 on homepage and payment link

### 3.3 Code Hygiene (continuous)
- [ ] Remove all `console.log` from production code
- [ ] Zod schemas for every API route input
- [ ] One Vitest case per verification edge case (wrong amount, wrong recipient, wrong mint, wrong network, replay attempt)
- [ ] Type-safe Supabase queries (generated types from schema)
- [ ] No `any` types in `src/lib/`

---

## 4. Technical Deployment Pipeline

### 4.1 Environments

| Env | URL | Network | Branch | Purpose |
|-----|-----|---------|--------|---------|
| **Local** | localhost:3000 | devnet | feature branches | Dev |
| **Preview** | `vertex-git-*.vercel.app` | devnet | PRs | QA |
| **Staging** | `staging.vertex.[domain]` | devnet | `staging` branch | Pre-prod rehearsal |
| **Production** | `vertex.[domain]` | mainnet-beta | `main` | Live |

### 4.2 Deployment Gate (every push to `main`)
1. CI green: `lint` + `test` + `build`
2. Manual QA: invoice → email → pay → verify flow on preview URL
3. No new env vars referenced without being set in Vercel dashboard
4. Tag release: `git tag v0.X.Y && git push --tags`
5. Watch RPC error rate + payment failure rate for first 30 min post-deploy

### 4.3 RPC Provider Strategy
- **Primary**: Helius (paid tier — set up by Jul 1)
- **Fallback 1**: Triton One
- **Fallback 2**: Public `mainnet-beta` RPC
- Log every retry; alert if any single attempt exceeds 5s

### 4.4 Database Migration Discipline
- Schema changes in `src/lib/schema.sql` only
- Every migration committed with the feature that needs it
- Backup Supabase before every schema change (export to local SQL)
- RLS policies covered by manual test cases before merge

---

## 5. Security & Audit Protocol

### 5.1 Before Mainnet (must complete by Jul 14)
- [ ] Run `/cso` skill comprehensive scan
- [ ] Manual RLS test: try to read another user's invoice with their UUID — must fail
- [ ] Manual RLS test: try to write to another user's `payment_events` — must fail
- [ ] Secret rotation: all keys in Vercel env, none in repo, none in client bundle
- [ ] CSP headers configured in `next.config.ts`
- [ ] Rate limiting on: `/api/payments/verify`, `/api/email-invoice`, public payment routes
- [ ] Audit log: every payment verification attempt → `payment_events` with IP, user-agent, outcome
- [ ] Dependency audit: `npm audit` clean, no critical/high CVEs
- [ ] Supabase service role key never reaches client (verify in built bundle)
- [ ] Legal pages live: Terms, Privacy, Refund/Dispute Policy
- [ ] Cookie / consent banner if collecting any analytics

### 5.2 Ongoing
- Weekly: `npm audit`, review Supabase auth logs
- Monthly: re-run CSO scan, review failed payments, check for RPC anomalies
- Quarterly: external security review (paid, ~$500–1000 — budget for Q4 2026)

---

## 6. Infrastructure Stack Setup

### 6.1 Domain Name (target: May 25)

**Recommended primary:** `vertex.cash` or `vertexpay.io` or `vertex.so`
*(Check availability via Namecheap; prefer .io / .so for crypto association.)*

**Steps:**
1. Register with **Namecheap** (privacy guard enabled — non-negotiable)
2. Configure Cloudflare DNS (proxy enabled for CDN + DDoS)
3. Point apex (`vertex.cash`) and `www` to Vercel
4. Set up subdomains: `app.`, `staging.`, `docs.`, `status.`, `blog.`
5. SSL auto-provisioned by Vercel
6. Add SPF, DKIM, DMARC records for email deliverability (see 6.3)

### 6.2 Professional Email (target: May 25, same day as domain)

**Stack:** Google Workspace ($6/mo Business Starter)

**Addresses to create:**
| Address | Purpose |
|---------|---------|
| `muhammad@vertex.cash` | Founder, public-facing |
| `hello@vertex.cash` | General inbox, contact form, beta signups |
| `support@vertex.cash` | Payment issue triage |
| `security@vertex.cash` | Vulnerability disclosure (linked from /security.txt) |
| `noreply@vertex.cash` | Transactional (invoices, receipts) — sender for Resend |
| `press@vertex.cash` | Forward to founder |

**Wire it up:**
- DKIM/SPF/DMARC: configure in Cloudflare DNS
- Resend domain verification: connect `noreply@vertex.cash` (replace current Resend sender)
- Sentry-style email signature: name + role + Vertex tagline + link

### 6.3 Analytics & Tracking

| Tool | Purpose | Setup deadline |
|------|---------|----------------|
| **Vercel Analytics** | Page views, web vitals | Done — verify enabled |
| **Vercel Speed Insights** | LCP, CLS, INP | May 22 |
| **PostHog** (self-host or cloud free tier) | Funnel: signup → wallet connect → invoice created → invoice sent → invoice paid | May 25 |
| **Plausible** or **Umami** (privacy-friendly) | Public marketing site analytics | May 25 |
| **Solana Beach / Helius webhook** | On-chain volume tracking | Jun 1 |
| **Founder dashboard** (in-app `/founder` route) | Live KPIs, beta users, volume | Jul 1 |

**Events to instrument** (PostHog):
- `wallet_connected` — wallet provider, network
- `invoice_created` — token, amount, has_contract
- `invoice_sent` — channel (email, copy-link, social)
- `payment_link_opened` — from invoice or direct
- `payment_submitted` — token, amount
- `payment_finalized` — token, amount, time-to-finality
- `payment_failed` — reason
- `contract_signed` — wallet address (anonymized)

### 6.4 Status Page
- **Tool:** [statusgator.com](https://statusgator.com) free tier OR build at `status.vertex.cash`
- **Components to monitor:** Frontend, API, Supabase, Helius RPC, Resend
- **Update cadence:** Auto-update on Vercel deploy + manual for incidents

### 6.5 Error Monitoring
- **Sentry** (free tier — 5K events/mo)
- Set up for both Next.js client and server
- Slack/email alerts on `error` level
- Source maps uploaded on every prod build

---

## 7. Brand Operating System

Source of truth: [brand.md](./brand.md). Operational rules below.

### 7.1 Visual Locks
- **Primary color**: `#00C853` Vertex Emerald
- **Background**: `#0A0A0A` Deep Void
- **Border**: `#1E1E1E` Slate
- **Text**: `#FFFFFF`
- **Accent (error/danger)**: `#FF4757`
- **Accent (warn/sandbox)**: `#FFA502`
- **Font (heading)**: Inter Tight or Geist — heavy italic for emphasis
- **Font (mono)**: JetBrains Mono — for hashes, addresses, amounts

### 7.2 Voice Rules
- **Always**: Direct, technical, authoritative. Short sentences. Active voice.
- **Use**: SVM, on-chain, finality, settle, infrastructure, precision, surgical.
- **Avoid**: "crypto-bro" slang, hype words ("revolutionary", "game-changer", "to the moon"), passive constructions, vague verbs ("leverage", "empower", "synergize").
- **Tense**: Present. ("Vertex settles." not "Vertex will settle.")

### 7.3 Asset Inventory (build by Jun 7)
- [ ] Logo system: wordmark, icon, monochrome, dark/light
- [ ] OpenGraph image (1200x630) — emerald-on-void with tagline
- [ ] Twitter card image
- [ ] Favicon set (16, 32, 180, 512)
- [ ] App screenshots (dashboard, invoice, payment) — for press kit
- [ ] Demo video (60s loop) — for landing hero
- [ ] Pitch deck (10 slides — use `/create-pitch-deck`)
- [ ] One-pager PDF for grants/partnerships

---

## 8. Social Media Operating System

### 8.1 Platform Strategy & Priority

| Platform | Priority | Goal | Posting cadence | Format |
|----------|----------|------|------------------|--------|
| **X / Twitter** | P1 — main channel | Build founder + product credibility | 3-5x daily | Long-form (Premium), threads, replies |
| **LinkedIn** | P2 — B2B reach | Reach agency operators, freelancers | 1x/day, weekdays | Long-form posts, case studies |
| **Farcaster** | P2 — crypto native | Reach Solana / Web3 builders | 2x/day | Casts, replies in `/solana`, `/founders` |
| **YouTube** | P3 — depth content | SEO + demos | 1x/week | 3-8 min tutorials, demos |
| **TikTok / Reels** | P3 — broad reach | Top-of-funnel virality | 2-3x/week | <60s product demos, founder POV |
| **Telegram** | P3 — community ops | Beta cohort comms | Daily | Private group |
| **Discord** | P4 — only if community demands | Builder home | Daily | Public server |
| **Warpcast/Farcaster** | P2 | Crypto-native discovery | 2x/day | Casts |

### 8.2 Account Setup Checklist (target: May 24)

For each platform: handle `@ghostiemoh` or `@vertex_cash` (founder vs brand split).

**X Setup:**
- [ ] @ghostiemoh — founder account (already exists, optimize bio)
- [ ] @vertex_cash — product account (claim if available)
- [ ] Bio template: `Building Vertex — the settlement layer for Solana freelancers. The surgical point of finality. → vertex.cash`
- [ ] Header image: Vertex brand asset
- [ ] Pinned post: 60s product demo video + link
- [ ] Verified domain link
- [ ] X Premium ✅ (already active)

**LinkedIn Setup:**
- [ ] Founder profile: title "Founder, Vertex — Solana settlement infrastructure"
- [ ] Vertex Company Page
- [ ] About section: 3-paragraph elevator pitch
- [ ] Logo + cover image

**Farcaster Setup:**
- [ ] `/vertex` channel creation
- [ ] Founder cast pinned: build journey

**YouTube Setup:**
- [ ] Channel: "Vertex" with brand banner
- [ ] First 3 video topics queued (see Section 12.4)

**Telegram Setup (Jul 1, before beta):**
- [ ] Private group: "Vertex Beta" — invite-only for 10 cohort
- [ ] Welcome message + onboarding doc

### 8.3 Bio Templates

**X founder (@Ghostiemoh):**
```
Building @vertex_cash — settlement layer for Solana freelancers.
On-chain finality. Professional invoicing. Surgical precision.
🔗 vertex.cash
```

**X product (@vertex_cash):**
```
The surgical point of finality.
Solana invoicing + contracts for high-agency freelancers.
→ vertex.cash
```

**LinkedIn founder:**
```
Founder, Vertex — Professional crypto invoicing for the Solana freelance economy.
On-chain analyst. Data-first builder. Antigravity Design.
```

---

## 9. Content Strategy — What to Post, When

### 9.1 Content Pillars (every post must serve one)

| Pillar | % of posts | Examples |
|--------|------------|----------|
| **Build in public** | 40% | "Shipped: lifecycle history on invoice page. Status now reflects on-chain reality." Screenshots, before/after. |
| **Educational** (crypto/Solana/freelance ops) | 25% | "Why payment finality matters more than payment speed (a thread)" |
| **Case study / proof** | 15% | "Freelancer settled $1,200 invoice in 2 seconds. Here's what made it possible." |
| **Brand / philosophy** | 10% | "The surgical point of finality — what it means and why we built Vertex around it." |
| **Engagement / community** | 10% | Replies, quotes, polls, asks |

### 9.2 X (Twitter) Daily Cadence

**You have X Premium — use long-form aggressively. No 280-char threads when one essay does the job.**

| Time (WAT) | Post type | Why |
|------------|-----------|-----|
| 08:00 | Morning ship update OR observation | Catches US night owls + EU morning |
| 12:00 | Educational thread or long-form essay | EU lunch + US morning peak |
| 16:00 | Engagement: quote-tweet, hot take, reply to ecosystem | Builds graph |
| 20:00 | Evening recap / behind-the-scenes / asset (screenshot, video) | US afternoon prime |

**Weekly rotation:**
- **Mon**: Week ahead — what's shipping
- **Tue**: Educational deep-dive (long-form essay)
- **Wed**: Build update with visuals
- **Thu**: Case study / user spotlight (when beta starts) OR competitor analysis
- **Fri**: Founder POV essay / weekend reading
- **Sat**: Replies, engagement, light asset
- **Sun**: Week recap + KPIs ("Week in numbers: X invoices, Y SOL settled")

### 9.3 Long-Form X Essay Slots (you have Premium — write full scenes)

Plan one per week. 800-1500 words each. Topics queue:

1. **"Why finality is the only number that matters in freelance crypto payments"** — settlement physics
2. **"The hidden cost of getting paid in crypto"** — RPC failures, wrong mints, lost memos
3. **"What I learned building a payment verification engine on Solana"** — technical war story
4. **"The freelancer's invoice problem isn't crypto — it's trust"** — positioning piece
5. **"Glassmorphism, spring physics, and the cockpit feel"** — design essay
6. **"Why I'm building Vertex solo and what that constrains"** — founder voice
7. **"On-chain agreements: the missing layer between Word docs and Stripe"** — category creation
8. **"What 10 beta freelancers taught me in 30 days"** — case study compilation

### 9.4 Content Production System

| Asset | Tool | Cadence | Time budget |
|-------|------|---------|-------------|
| Daily X posts | Draft in Obsidian, schedule via [Typefully](https://typefully.com) | Daily | 30 min |
| Weekly long-form essay | Write Sun → schedule Tue | Weekly | 90 min |
| Build update screenshot | CleanShot or native screenshot, brand-mark in Figma | Daily | 5 min |
| Demo GIF / video | OBS Studio → CloudConvert | Weekly | 30 min |
| YouTube video | OBS + DaVinci Resolve | Weekly | 3-4 hours |
| Pitch / press images | Figma | As needed | — |

### 9.5 Repurposing Map

One long-form essay → 5 derivative assets:
1. **X essay** (1500 words, native)
2. **LinkedIn post** (700 words, more business-framed)
3. **Farcaster cast** (200 words, technical hook)
4. **YouTube short** (60s video summary)
5. **Blog post** (`blog.vertex.cash` — SEO target keyword)

---

## 10. Growth Engine — User Acquisition

### 10.1 Channel Priority

| Channel | Cost | Time-to-First-User | Sustainable? | Priority |
|---------|------|---------------------|--------------|----------|
| **Founder X presence + outreach** | $0 + time | Days | Yes | P1 |
| **Superteam Nigeria / global** | $0 + time | Days | Yes | P1 |
| **Direct cold DM to freelancers** | $0 + time | Days | Limited (saturates) | P1 |
| **Content / SEO** | $0 + time | Months | Yes (compounds) | P2 |
| **Solana ecosystem partnerships** | $0 + time | Weeks | Yes | P2 |
| **Paid X ads** | $50-500/mo | Days | Test only | P3 |
| **Hackathon / grant** | $0 | Weeks | Yes (one-shot legitimacy) | P1 |
| **Press / podcasts** | $0 + time | Weeks | Limited | P3 |
| **Referral program** | Revenue share | Weeks | Yes | P3 (post-beta) |

### 10.2 The First-User Sequence

**Today through Jul 14 — find them. Jul 15+ — onboard them.**

**Where the first 10 freelancers live (ranked):**
1. **Superteam Nigeria Discord/Telegram** — your home base, you're a member
2. **Superteam global (LATAM, Vietnam, India, Germany, UAE)** — high freelancer density
3. **Solana Twitter** — search "Solana freelancer", "USDC payment", "got paid in crypto"
4. **Farcaster `/solana`, `/founders`, `/freelance` channels**
5. **r/solana**, **r/freelance** (be useful, don't pitch)
6. **Crypto Twitter agency networks** — design studios, dev shops billing in USDC
7. **LinkedIn search**: "Web3 freelance designer" / "Solana developer freelance"
8. **Local Lagos crypto WhatsApp groups** (you have access)

### 10.3 The First-Paying-User Playbook

**Step 1 — Lower friction to zero:**
- No signup required to *receive* a payment
- Client pays without creating account (already supported ✅)
- Freelancer onboards in <90 seconds: connect wallet → first invoice

**Step 2 — White-glove the first 10:**
- Personal Telegram/X DM onboarding
- Walk them through their first real invoice on a call
- Pay their first $5 fee equivalent yourself if needed (this is marketing spend, not loss)

**Step 3 — Force a feedback loop:**
- Day 1 after signup: "How was setup? One word."
- Day 7: "Sent any invoices? What's blocking?"
- Day 30: "Would you pay for this? At what price?"

### 10.4 First $1,000 in Volume — Tactical Plan

**Math:** $1,000 ÷ avg invoice ($200) = 5 invoices.

**The 5 invoices:**
1. **Self-issue #1**: Real invoice to a real client of yours. Pay yourself $50. (Demonstrates skin in game.)
2. **Superteam Nigeria member #1**: DM 5, get 1 to invoice their next gig through Vertex.
3. **Twitter inbound from build-in-public**: Post "free white-glove onboarding for first 5 freelancers" → expect 2-3 takers.
4. **Direct cold outreach #1**: Email 20 visible Solana freelancers; close 1.
5. **Partnership invoice**: A friendly agency invoices a real client through Vertex.

**Timeline:** Aim to hit $1K by Jul 31 (2 weeks into beta).

### 10.5 Outbound Outreach Template

**X DM / Cold email — Solana freelancer:**
```
Hey [name] — saw your work on [specific thing].

I'm building Vertex — invoicing + on-chain settlement for Solana freelancers.
Want to be one of 10 beta users who get free white-glove onboarding?

I'll personally set you up + help you settle your next real invoice in <2 mins.

[link to 60s demo]

— Muhammad
```

**Conversion target:** 1 in 20 DMs → onboarded user.

---

## 11. Advertising Strategy

**Default position: Don't pay for ads until product-market signal is clear.**

But test once Phase 5 is live:

| Channel | Budget cap | When to test | Success criterion |
|---------|------------|--------------|-------------------|
| **X promoted posts** | $50 first test | Aug 1 | CPC < $0.50, 1+ signup |
| **X ads to lookalike of @superteamnigeria** | $200 | Aug 15 | CAC < $20 |
| **LinkedIn promoted posts** to "Web3 freelancer" job titles | $200 | Sep 1 | CAC < $30 |
| **Reddit promoted post in r/solana** | $100 | Sep 15 | 5+ qualified visits |

**Hard rule:** Kill any campaign that doesn't show signal at 50% of budget.

---

## 12. Community Building

### 12.1 Phased Community Model

| Phase | Community shape | Cost to maintain | When |
|-------|------------------|------------------|------|
| **Stealth (now → Jul 15)** | None — DM relationships only | 0 | Now |
| **Cohort (Jul 15 – Aug 15)** | Private Telegram, 10 beta freelancers + you | 30 min/day | Beta |
| **Public Builder Group (Aug 15+)** | Public Telegram or Discord, ~50-200 members | 60 min/day | Post-beta |
| **Ambassador program (Q4 2026)** | 5-10 referring power-users with revenue share | 90 min/week | Later |

### 12.2 Beta Cohort Charter (Jul 15 — write before)

**Members get:**
- White-glove onboarding (1:1 call)
- Direct line to founder
- Free fee waiver for first 6 months
- Public credit (their handle on the site as "Founding Operator")
- First access to new features

**Members give:**
- Honest feedback weekly
- 1 invoice settled through Vertex per week minimum
- Permission to anonymize their volume in case studies

### 12.3 Engagement Mechanics

- **Weekly stand-up** in Telegram (every Mon, async)
- **Monthly call** with full cohort (1 hour)
- **Public leaderboard** (anonymized): top settlers, most invoices, longest streak
- **Direct ship requests**: cohort members can request features and vote

---

## 13. Partnerships & Outreach

### 13.1 Priority Partnership Targets (Phase 6)

| Partner type | Specific targets | Value exchange |
|--------------|------------------|----------------|
| **Solana ecosystem orgs** | Superteam Nigeria, Solana Foundation grants, SendAI | Reach, legitimacy, possible grant |
| **Freelance platforms** | Replit Bounties, Layer3, Dework | Integration / cross-listing |
| **Wallet providers** | Phantom, Solflare, Backpack | Featured in their merchant directories |
| **Stablecoin issuers** | Circle (USDC), Tether | Co-marketing, possible Stripe-like merchant program |
| **Solana DePIN / DAO orgs** | Render, Helium, Solana DAOs paying contributors | Bulk invoice / payroll-lite use case |
| **Accountants / tax tools** | Cointracker, Koinly | Export integration |
| **Agencies** | Solana-native dev shops, design studios | Direct customers + case studies |

### 13.2 Outreach Cadence
- **5 partnership pitches per week** starting Aug 16
- **Track in a Notion table** (or simple Supabase table): name, contact, status, next action, date

### 13.3 Grant & Sponsorship Pipeline
- [ ] **Solana Foundation Grants** — apply Jul 15 (need beta traction)
- [ ] **Superteam Earn Grant** — already in motion per `grant-application.md`
- [ ] **Colosseum Eternal hackathon** — if a track fits
- [ ] **SendAI grants** — if applicable to settlement infrastructure
- [ ] **Circle Account Abstraction grant** — if USDC volume hits threshold

---

## 14. SEO Strategy

### 14.1 Target Keywords (Tier 1)

| Keyword | Intent | Difficulty | Target page |
|---------|--------|------------|-------------|
| "Solana invoice" | High | Low | Homepage |
| "Crypto invoice freelancer" | High | Med | `/for-freelancers` |
| "USDC invoice" | High | Med | `/usdc-invoicing` |
| "Solana freelance payment" | Med | Low | Blog |
| "On-chain contract Solana" | Med | Low | `/contracts` |
| "Get paid in SOL" | High | Low | Blog |
| "Solana payment link" | High | Low | `/payment-links` |
| "Request Network alternative" | Med | Low | Comparison page |
| "Helio alternative" | Med | Low | Comparison page |

### 14.2 Technical SEO Checklist
- [ ] `sitemap.xml` auto-generated by Next.js
- [ ] `robots.txt` allows search engines
- [ ] OG tags on every page (`generateMetadata`)
- [ ] Twitter card meta on every page
- [ ] JSON-LD structured data: Organization, WebSite, Product, FAQPage
- [ ] Canonical URLs everywhere
- [ ] Page titles + meta descriptions audited
- [ ] Image alt text on every image
- [ ] Core Web Vitals all green
- [ ] `blog.vertex.cash` indexed within 7 days of launch

### 14.3 Content SEO Engine
- **One blog post per week** starting Jun 1 (12 posts by Sep 30)
- Hosted at `blog.vertex.cash` (Next.js subroute or Ghost/Hashnode)
- Each post: 1500+ words, target one keyword, internal links to product pages
- Backlinks: cross-post to dev.to, Hashnode, Medium — canonical to blog.vertex.cash

---

## 15. Marketing Funnels

### 15.1 The Vertex Funnel

```
[Content / X / partnerships]
       ↓
[Landing page — vertex.cash]
       ↓  CTR 4-8%
[Connect wallet OR view live demo]
       ↓  CR 30-50%
[Create first invoice]
       ↓  CR 60-80%
[Send invoice to real client]
       ↓  CR 40-60% (this is the hard step)
[Client pays — settled on-chain]
       ↓
[FREELANCER RETURNS — second invoice]
       ↓  Target: 30% week-over-week
[Word of mouth / referral]
```

### 15.2 Funnel KPIs to Instrument
- Landing → Wallet connect: target 30%
- Wallet connect → First invoice: target 60%
- First invoice → First sent: target 50%
- First sent → First paid: target 40%
- First paid → Second invoice (within 14d): target 30%

### 15.3 Funnel Leakage Diagnosis (run weekly)
For each drop-off >50%, ask:
- Is the next step obvious?
- Is there a status / progress indicator?
- Is there a stuck-state (loading, error)?
- Did we lose context (state, session, wallet)?

---

## 16. KPI Tracking — The Numbers Wall

### 16.1 Master KPI Sheet (update daily, review weekly)

| Metric | Today | Week | Month | 90d Target |
|--------|-------|------|-------|------------|
| Total finalized volume (USD) | $0 | $0 | $0 | $5,000 |
| Active freelancers (7d) | 0 | 0 | 0 | 10 |
| Invoices created | 0 | 0 | 0 | 50 |
| Invoices paid | 0 | 0 | 0 | 30 |
| Avg time to finality (s) | — | — | — | <30s |
| Failed payments (%) | — | — | — | <5% |
| X followers (@vertex_cash) | — | — | — | 1000 |
| X followers (@Ghostiemoh) | [current] | — | — | +500 |
| Daily X impressions | — | — | — | 10K avg |
| Blog visits | 0 | 0 | 0 | 2K |
| Beta cohort signups | 0 | 0 | 0 | 10 |
| Cohort NPS | — | — | — | >50 |

### 16.2 Where to Track
- **Spreadsheet**: Google Sheet `Vertex KPIs` — auto-updated where possible
- **In-app**: `/founder` private route, populated from Supabase
- **Daily Sunday post**: public "Week in numbers" on X — accountability mechanism

---

## 17. Launch Strategy

### 17.1 Mainnet Soft Launch (Jul 14)
- No public announcement
- Mainnet enabled in code, opt-in for cohort only
- Internal/cohort-only invoice test on real volume
- Monitor for 48 hours
- Status page goes live

### 17.2 Beta Launch (Jul 15)
- Telegram cohort announcement
- Founder X post: "Vertex beta is live. 10 founding operators. Apply: [link]"
- Personal DMs to ~50 pre-warmed prospects

### 17.3 Public Launch (Aug 15 — end of beta)
**Pre-launch (Aug 1-14):**
- Build hype with daily countdown posts
- Drop 2-3 beta case studies as long-form essays
- Pre-write Product Hunt assets

**Launch day (target: Tuesday, Aug 19, 9am WAT / 12am PT):**
- Product Hunt launch (target: top 5 daily)
- Hacker News Show HN post
- Reddit r/solana, r/cryptocurrency posts
- X launch thread (long-form essay format)
- Press kit emailed to: The Block, CoinDesk, Solana newsletter writers
- Cohort members rally support (PH upvotes, X retweets)

**Launch day stack to prepare:**
- Loom/YouTube 90s demo video
- Press kit (ZIP): logo, screenshots, fact sheet, founder bio
- 3 prepared X posts (launch tweet, mid-day update, evening recap)
- Slack/Telegram channels ready to manage inbound

---

## 18. Scaling Strategy (Sep 30 onward)

### 18.1 Scale Triggers

Move to next scaling phase only when prior phase metric is hit and stable for 2 weeks:

| Stage | Trigger | Action |
|-------|---------|--------|
| **Validate** | 10 active users, $5K volume | Fix retention, prove repeat usage |
| **Optimize** | 50 active users, $25K volume | Hire first contractor (engineer or marketer) |
| **Distribute** | 200 active users, $100K volume | Open paid ads, hire growth role |
| **Institutionalize** | $1M cumulative volume | Raise (if needed), build team to 5 |

### 18.2 Scale-Blocking Risks to Pre-Solve
- **Stripe-grade reliability** before doubling user count
- **Onboarding flow that needs zero founder touch** before pushing distribution
- **Refund/dispute policy and process** before unbounded growth
- **Compliance review** (Nigerian + US/EU positioning) at $100K cumulative

---

## 19. Monetization Strategy

### 19.1 Hypothesis Stack (test in order)

| # | Model | Test month | Hypothesis |
|---|-------|------------|------------|
| 1 | **Free during beta** | Jul-Aug | Get to PMF; charge later |
| 2 | **Pay-what-you-want / tip jar** | Sep | Surface willingness to pay without coercion |
| 3 | **Basis-point fee** (e.g. 25 bps, capped at $5) | Oct | Volume-aligned revenue |
| 4 | **Pro subscription** ($9/mo) for recurring invoices, multi-client, exports | Nov | Pro tier unlocks repeat user value |
| 5 | **Enterprise / agency tier** ($49/mo) for team accounts, API, white-label | Q1 2027 | Agency multiplier |

### 19.2 Revenue Targets
- **Q4 2026**: First $100 in revenue (any model)
- **Q1 2027**: $1,000 MRR
- **Q2 2027**: $5,000 MRR
- **Q4 2027**: $25,000 MRR

### 19.3 Pricing Page Principles
- One-screen comparison: Free / Pro / Agency
- Clear feature differentiators (not feature creep on free)
- Annual = 2 months free
- Crypto-native: pay in USDC (eat your own dog food)

---

## 20. Operations, Automation & Documentation Systems

### 20.1 Daily Operations Stack

| Tool | Purpose |
|------|---------|
| **Obsidian** | Personal knowledge base, daily notes, content drafts |
| **Notion** or **Linear** | Roadmap, bugs, tasks (single source) |
| **Typefully** | X scheduling |
| **Calendly** | Beta user onboarding calls |
| **Figma** | Brand assets, mockups |
| **Loom** | Async demos, walkthroughs |
| **Telegram** | Cohort + power-user comms |
| **Google Workspace** | Email, docs, sheets |
| **GitHub Issues** | Bug + feature tracking |
| **GitHub Projects** | Sprint board |

### 20.2 Automations to Build (in priority order)

| # | Automation | Tool | Saves | Build by |
|---|-----------|------|-------|----------|
| 1 | Daily KPI digest emailed at 8am | Cron + Supabase + Resend | 5 min/day | Jul 1 |
| 2 | New beta user → Telegram welcome + setup checklist | Webhook | 10 min/user | Jul 14 |
| 3 | Failed payment → Slack alert + Sentry issue | Sentry + webhook | Mean-time-to-detect | Jul 1 |
| 4 | New invoice paid → tweet draft suggestion | Cron + GPT | 15 min | Aug 1 |
| 5 | Weekly KPI tweet auto-drafted | Cron + Supabase | 20 min/week | Aug 1 |
| 6 | Cohort weekly stand-up reminder | Telegram bot | 5 min | Jul 15 |
| 7 | Cold outreach tracker → automated follow-up email at +3 days | Email + Supabase | 30 min/week | Aug 15 |
| 8 | Status page auto-update from Vercel webhook | Webhook | — | Jul 7 |

### 20.3 Documentation System

**Internal (`/docs` in repo):**
- ROADMAP.md (product roadmap)
- FOUNDER_OS.md (this file)
- DAPP_CHECKLIST.md (tech polish)
- FOUNDER_CONTEXT.md (business context)
- brand.md (brand bible)
- `runbooks/` — incident response, deploy steps, RPC failover

**Public (`docs.vertex.cash`):**
- Getting started for freelancers (90s read)
- How to send your first invoice
- How to receive a payment as a client (zero-account flow)
- Verification & transparency guide
- Token support & networks
- Refund / dispute policy
- API reference (when API ships, Q4)

**Marketing (`vertex.cash`):**
- Homepage, /for-freelancers, /for-agencies, /pricing, /security, /blog

### 20.4 Knowledge Capture Discipline

Every week, write down:
- 1 thing that broke and how it was fixed (→ runbook entry)
- 1 surprising user insight (→ content idea)
- 1 abandoned idea and why (→ "later bets" log)
- 1 thing to never do again (→ feedback memory)

---

## 21. Team Structure & First Hires

### 21.1 Solo Phase (now → Sep 30)
- You handle: product, eng, marketing, comms, ops
- Allocate **70% build / 30% distribute** until beta starts
- Switch to **50% build / 50% distribute** at beta start
- Switch to **30% build / 70% distribute** after public launch

### 21.2 First Hires Sequence (only after $1K MRR)

| Order | Role | Type | Trigger | Why first |
|-------|------|------|---------|-----------|
| 1 | **Customer success / beta wrangler** (part-time, 10h/wk) | Contractor | 50+ active users | Frees founder from onboarding bottleneck |
| 2 | **Content writer / community manager** | Contractor | 100+ users, $2K MRR | Distribution at scale |
| 3 | **Backend engineer** (Solana + Supabase) | Contractor → FT | $5K MRR or shipping velocity blocked | Build velocity |
| 4 | **Designer** (Antigravity-fluent) | Contractor | Ship velocity blocked on design | Polish at scale |
| 5 | **Operations lead** | FT | $25K MRR | Scale operations |

### 21.3 Sourcing Channels
- **Superteam talent pool** (highest signal)
- **Crypto Twitter** (your warm graph)
- **Solana hackathon alumni**

---

## 22. Weekly & Daily Execution Schedule

### 22.1 Week 1 (May 18 – May 24, this week)

**Theme: Verification reliability + brand infrastructure setup.**

| Day | Build (AM) | Distribute (PM) |
|-----|------------|------------------|
| **Mon May 18** | Audit `/api/payments/verify` for idempotency; add Vitest cases | Post: "Week ahead — shipping verification reliability for Vertex." Set up Typefully account. |
| **Tue May 19** | Implement idempotency lock + retry-safe write | Long-form essay: "Why finality is the only number that matters in freelance crypto payments." |
| **Wed May 20** | Add `payment_events` lifecycle history UI on invoice page | DM 10 Superteam Nigeria members re: beta interest. Screenshot today's ship → tweet. |
| **Thu May 21** | Status drift fix: dashboard totals = finalized only | Apply to Solana Foundation grant (if not already in motion). Draft case study outline for self-issued invoice. |
| **Fri May 22** | RPC failover telemetry + Helius primary setup | Founder POV essay. **No deploys today.** Plan weekend content. |
| **Sat May 23** | Cleanup: console.log removal, type-safety pass | Engagement: 20 quote-tweets in Solana ecosystem. Reply to 10 posts. |
| **Sun May 24** | **Weekly review** + plan Week 2 | Week-in-numbers post. Schedule next week's content in Typefully. **Buy domain.** Set up Google Workspace. |

### 22.2 Week 2 (May 25 – May 31)

**Theme: Close out Phase 1 + brand setup complete.**

| Day | Build (AM) | Distribute (PM) |
|-----|------------|------------------|
| Mon May 25 | Token mint validation hardening (devnet vs mainnet USDC) | Domain DNS live. Email accounts wired up. |
| Tue May 26 | Memo validation enforcement + tests | Long-form essay #2: "The hidden cost of getting paid in crypto." |
| Wed May 27 | Wallet disconnect mid-flow graceful reset | Set up Plausible/PostHog. Instrument 8 funnel events. |
| Thu May 28 | Email send error handling + retry | Reach out to 5 partnership prospects (wallets, freelance platforms). |
| Fri May 29 | Manual QA scripts: 4 happy paths + 6 failure paths | Status page live at `status.vertex.cash`. Sentry wired. |
| Sat May 30 | Lighthouse audit + LCP optimization | Engagement day. Reply to 20 ecosystem accounts. |
| Sun May 31 | Phase 1 acceptance criteria pass/fail check. **Phase 1 complete.** | Week-in-numbers. Plan Week 3 + Phase 2. |

### 22.3 Weeks 3–6 (Jun 1 – Jun 28) — Phase 2 Invoice Polish

See ROADMAP.md Phase 2 ship list. Daily structure stays the same: AM build / PM distribute.

**Milestone gates:**
- End of Week 3 (Jun 7): Brand asset inventory complete
- End of Week 4 (Jun 14): Phase 2 acceptance criteria pass — invoice workflow polished
- End of Week 5 (Jun 21): Contract↔Invoice linking in progress
- End of Week 6 (Jun 28): Phase 3 acceptance criteria pass — contracts can be drafted/signed/invoiced/paid end-to-end

### 22.4 Weeks 7–8 (Jun 29 – Jul 14) — Mainnet Readiness Sprint

**Hard focus. Reduce distribution time. Sprint to production-ready.**

- CSO audit
- Rate limiting
- Production RPC config
- Legal pages live
- Monitoring/alerting fully wired
- Mainnet soft launch Jul 14

### 22.5 Weeks 9–13 (Jul 15 – Aug 15) — Private Beta

- Onboard 1-2 freelancers per day for the first 10 days
- Daily check-in with cohort in Telegram
- 1 ship per day based on cohort feedback
- 1 case study published per week

### 22.6 Weeks 14+ (Aug 16 onward) — Growth & Public Launch

Per Phase 6 scope + Section 17.3 public launch.

---

## 23. Monthly Operating Cadence

### Monthly Ritual (last Sunday of each month, 2h)
1. Update KPI dashboard (Section 16)
2. Write monthly update — public post:
   ```
   Vertex — Month [N] in numbers:
   • [X] active freelancers
   • $[Y] settled on-chain
   • [Z] invoices finalized
   • Avg time-to-finality: [W]s
   
   What shipped: [3 things]
   What's next: [3 things]
   ```
3. Risk register review (Section 25)
4. Monetization experiment review
5. Cohort NPS survey (Jul onward)
6. Plan next month's content slate

---

## 24. User Psychology & Conversion Optimization

### 24.1 Conversion Levers (in priority of impact)

| Lever | Impact | Effort |
|-------|--------|--------|
| **Reduce time to first invoice** (<90s) | Huge | Med |
| **Make first invoice a guided walkthrough** | Huge | Med |
| **Surface social proof** ("X freelancers settled $Y") | Med | Low |
| **Anchor on outcome** ("Get paid instantly") not feature | Med | Low |
| **Default tokens** to USDC (most familiar) | Med | Low |
| **One-click sample invoice** (no wallet needed for demo) | High | Med |
| **Inline education** (tooltips on "finality", "memo", "RLS") | Med | Low |
| **Receipt page that feels final** (the moment of finality is the *brand*) | High | Med |

### 24.2 Psychological Defaults to Engineer
- **Anchoring**: show "professional invoice" not "crypto payment"
- **Loss aversion**: "Never lose proof of payment again"
- **Authority**: every page has the brand language of precision and finality
- **Scarcity (beta phase only)**: "10 founding operators, [X] spots left"
- **Reciprocity**: free white-glove onboarding for first cohort

### 24.3 The Receipt as Brand Moment
The final payment receipt is the highest-trust moment in the product. Treat it as the hero:
- Tx signature in monospace, copyable, linked to Solscan
- "Finalized on-chain at [exact timestamp]"
- Network, token, amount, recipient — all in surgical precision
- Brand mark: subtle, lower-right
- "Settled in [N] seconds" — speed as proof of finality

---

## 25. Risk Register

Reviewed monthly. Update probability/impact as conditions change.

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| **RPC outage during mainnet payment** | Med | High | Multi-provider failover; manual settlement runbook |
| **USDC depeg event** | Low | High | Pause USDC route automatically; comms playbook ready |
| **Supabase RLS misconfiguration leaks data** | Med | Critical | Pre-mainnet manual RLS test; quarterly re-audit |
| **Solo founder burnout** | Med | High | Discipline weekend break; offload comms via automations |
| **Zero PMF after beta** | Med | High | Pre-decided pivot decision tree at Aug 15 |
| **Competitor (Helio, Request) ships exact feature** | Med | Med | Focus on freelancer workflow depth, not raw payments |
| **Solana network outage** | Low | High | Public status page; transparency-first comms |
| **Beta user gets defrauded** | Low | Critical | Clear UX between sandbox/prod; verification UX is unmistakable |
| **Regulatory pressure on stablecoin invoicing** | Low | High | Position as infrastructure, not money transmission; legal review at $100K cumulative |
| **GitHub repo compromise** | Low | Critical | 2FA + key rotation; no secrets in repo (audit Jul 1) |
| **Domain expires / DNS hijack** | Low | High | Auto-renew + Cloudflare 2FA |
| **Hackathon judge gives bad public review** | Med | Med | Get product to "demonstrably reliable" before submitting |

---

## 26. Decision Rules (When You're Stuck, Default to These)

1. **Reliability > features.** Every time.
2. **One user > ten signups.** Talk to people who actually settled volume.
3. **Volume > vanity.** $100 settled beats 10,000 followers.
4. **Ship daily > ship perfectly.** Antigravity standards apply, but velocity is the moat.
5. **Build in public > build in private.** Even when it's embarrassing.
6. **Say no faster.** Most asks should be declined or deferred.
7. **Distribution is half the product.** Schedule it like code.
8. **Charge before you're ready.** Money is the cleanest feedback.
9. **Talk to 5 users before any new feature.** Always.
10. **If two paths exist, take the reversible one first.**

---

## 27. The Founder's Daily Self-Check

End of each day, answer 3 questions in a daily note (Obsidian):

1. **What shipped today?** (Code, content, or conversation. If nothing — why?)
2. **What did one user say or do today?**
3. **What's the single most important thing for tomorrow?**

If you cannot answer #1 and #2 on the same day for three days in a row — stop. Re-read this document.

---

## 28. Appendix — Founder Skills to Invoke

Available in this workspace. Use them.

| Skill | When |
|-------|------|
| `/find-next-crypto-idea` | Already past — stay on Vertex |
| `/build-with-claude` | When stuck on a build phase |
| `/cso` | Pre-mainnet (Jul 1) + monthly |
| `/review-and-iterate` | Before each phase merge |
| `/create-pitch-deck` | Jun 1 — for grants/partnerships |
| `/marketing-video` | Jun 20 — for launch hero |
| `/competitive-landscape` | Quarterly |
| `/roast-my-product` | Before public launch |
| `/product-review` | End of beta (Aug 15) |
| `/deploy-to-mainnet` | Jul 1-14 |
| `/colosseum-resources` | When choosing sponsor integrations |

---

## 29. Closing Standing Order

> **Open this file every morning. Close it every night. Ship something every day. Talk to a user every day. Post something every day.**
>
> Vertex wins when finality becomes the brand — not when features become the brand.
>
> Build slowly enough to be precise. Ship daily enough to compound.

---

*FOUNDER_OS.md · Last revised 2026-05-18 · Revise weekly.*
