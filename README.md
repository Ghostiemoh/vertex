# Vertex - Crypto invoicing for freelancers

> Create wallet-signed invoices, agreement drafts, and crypto payment links for client work on Solana.

## What Vertex does

- Create invoice PDFs with a recipient wallet, due date, and payment link
- Generate direct payment links for SOL, USDC, or USDT
- Draft service agreements you can review before sending to a client
- Track recent invoices, clients, and payment status in one dashboard
- Verify Solana transaction signatures when a client sends payment

## Trust model

- Wallet connection and Supabase session are separate: users connect a wallet, then sign in to unlock saved data
- Public pay links are served through a narrow server route instead of broad public table policies
- Invoice payment state is updated after server-side verification of the transaction signature
- Devnet and mainnet are environment-driven, with explicit UI labeling for sandbox vs production

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4, Framer Motion |
| Blockchain | `@solana/web3.js`, `@solana/wallet-adapter-*` |
| Backend | Supabase (Postgres + RLS) |
| PDF | jsPDF + `jspdf-autotable` |
| Hosting | Vercel |

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Solana wallet (Phantom, Solflare, etc.)

### Setup

```bash
git clone https://github.com/your-username/Vertex.git
cd Vertex
npm install
cp .env.example .env.local
```

### Required environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for server-side invoice verification and payment status updates |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Optional custom RPC endpoint |
| `NEXT_PUBLIC_SITE_URL` | Public app origin used in generated links |
| `NEXT_PUBLIC_VERTEX_FEE_BPS` | Optional Vertex fee in basis points |
| `NEXT_PUBLIC_VERTEX_TREASURY_WALLET` | Optional treasury wallet override |

### Database setup

1. Open your Supabase SQL editor.
2. Run [`src/lib/schema.sql`](./src/lib/schema.sql).
3. Ensure Solana Web3 auth is enabled in Supabase Auth settings if you want wallet sign-in.

### Local development

```bash
npm run dev
```

### Quality checks

```bash
npm run lint
npm run build
```
