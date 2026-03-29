# Clozze

**AI-powered, deal-centric real estate platform with conversational voice agents and real-time property research.**

Clozze acts as your AI transaction coordinator, assistant, and communication hub. It helps agents and brokers manage deals from contract to close with structured workflows, centralized communication, and intelligent automation.

Powered by Cloudflare edge infrastructure, ElevenLabs voice AI, and Firecrawl real-time data retrieval, Clozze brings everything into one unified system.

## Features

- **AI Transaction Assistant**  
  Voice and chat-based assistant that can research properties, generate listing content, and guide transactions in real time using Firecrawl, ElevenLabs, and Cloudflare.

- **Deal and Task Management**  
  Structured workflows tied to buyers, listings, and transactions with calendar sync, recurring tasks, and team assignment.

- **Centralized Communication Hub**  
  Gmail sync, AI-powered email triage, suggested responses, and unified conversation tracking.

- **Calendar Coordination**  
  Google and Apple Calendar sync with bi-directional event management and deadline tracking.

- **Document Workflows**  
  DocuSign and Dotloop integrations for e-signatures, document parsing, and transaction management.

- **Team Collaboration**  
  Multi-agent team management with role-based access, shared calendars, and performance tracking.

- **AI-Powered Content Generation**  
  Listing descriptions, buyer messaging, and marketing copy generated with tone-matched AI.

- **Transaction Engine**  
  State-driven lifecycle with guided workflows, suggested tasks, and audit history.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) |
| AI | Google Gemini, OpenAI GPT via AI Gateway |
| Research | Firecrawl for real-time property and market data |
| Voice | ElevenLabs Conversational AI Agent |
| Edge and Infrastructure | Cloudflare Workers, Edge Runtime, Global CDN |
| Integrations | Gmail, Google Calendar, Apple Calendar, DocuSign, Dotloop, Follow Up Boss, Stripe |

## Project Structure

```
src/
├── components/       # UI components organized by feature
│   ├── assistant/    # AI chat and voice assistant
│   ├── contacts/     # Contact management
│   ├── dashboard/    # Dashboard widgets and cards
│   ├── integrations/ # Third-party integration modals
│   ├── layout/       # App shell, sidebar, header
│   ├── onboarding/   # User onboarding flow
│   ├── team/         # Team management views
│   ├── transactions/ # Transaction workflow UI
│   └── ui/           # Shared design system (shadcn)
├── contexts/         # React contexts (auth, user, data)
├── hooks/            # Custom hooks for data and integrations
├── lib/              # Utilities, analytics, task configs
├── pages/            # Route-level page components
└── integrations/     # Supabase client and type definitions

supabase/
└── functions/        # Edge Functions (AI, email, calendar, payments)

docs/
└── plan.md           # Architecture and roadmap notes
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd clozze
npm install
npm run dev
```

The app runs at `http://localhost:8080`.

## Environment

The project uses Supabase for backend services. Environment variables are configured automatically via the connected Supabase project.

## License

Proprietary © 2025 Clozze. All rights reserved.
