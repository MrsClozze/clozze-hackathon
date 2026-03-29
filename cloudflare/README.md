# Clozze AI Worker

Cloudflare Worker + Durable Objects that serves as the orchestration and memory layer for Clozze's AI assistant.

## Architecture

```
Client (Clozze App)
  → Cloudflare Worker (/ai/chat)
    → Resolve Durable Object (per listing or buyer)
    → Pull conversation memory
    → Enrich request with memory context
    → Forward to Supabase Edge Function (task-ai-chat / clozze-ai-create)
    → Stream response back to client
    → Append interaction to Durable Object memory
```

## Setup

```bash
cd cloudflare
npm install

# Set secrets
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Local dev
npm run dev

# Deploy
npm run deploy
```

## Endpoints

### `POST /ai/chat`
Main orchestration endpoint. Accepts the same payload as `task-ai-chat` with additional fields:
- `listingId` — resolves listing memory
- `buyerId` — resolves buyer memory  
- `flow` — which edge function to call (default: `task-ai-chat`)

### `GET /memory/listing/:id`
Direct read of a listing's Durable Object memory.

### `GET /memory/buyer/:id`
Direct read of a buyer's Durable Object memory.

### `GET /health`
Health check.

## Durable Objects

- **ListingMemory** — one per listing, stores conversation history, actions, workflow state
- **BuyerMemory** — one per buyer, same structure

Each stores up to 50 conversation turns and 100 actions. Older entries are trimmed automatically.

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (set in wrangler.toml) |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable key (secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) |
