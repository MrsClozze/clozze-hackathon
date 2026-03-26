

# Add Session Termination After Password Change

## Summary
After a successful password change (either from Settings or via the Reset Password flow), all **other** active sessions will be terminated. This ensures that if a password is compromised, changing it immediately locks out any attacker sessions on other devices.

## Changes

### 1. Settings page -- password change (`src/pages/Settings.tsx`)
- After the successful `updateUser({ password })` call (line 348-352), add a call to `supabase.auth.signOut({ scope: 'others' })` to revoke all other refresh tokens while keeping the current session active.

### 2. Reset Password page (`src/pages/ResetPassword.tsx`)
- After the successful `resetAuthClient.auth.updateUser({ password })` call, add a call using the **main** `supabase` client to `supabase.auth.signOut({ scope: 'global' })`. Since the reset page uses an ephemeral (non-persisted) client, we want to revoke **all** persistent sessions (including any that were previously active on other devices). The user is redirected to login afterward, so no session needs to be preserved.

## Technical Details

### Settings page (keep current session, kill others)
```typescript
// After updateUser succeeds:
await supabase.auth.signOut({ scope: 'others' });
```

### Reset Password page (kill all sessions globally)
```typescript
// After updateUser succeeds, revoke all persistent sessions:
await supabase.auth.signOut({ scope: 'global' });
```

The `scope: 'others'` option revokes all refresh tokens except the current one. The `scope: 'global'` option revokes all refresh tokens including the current one -- appropriate for the reset flow since the user will log in fresh afterward.

No database changes required.

---

# Future Roadmap: Record-Level Marketing & Outreach

## Status: Future Initiative (not in current phase)

## Overview
AI-assisted outbound communications tied to buyer and listing records, enabling agents to send market updates, comps, listing outreach, and nurture messages through connected channels.

## Planned Capabilities
1. **Record-level communication preferences** — per-buyer and per-listing settings for outreach frequency, channel, and content type
2. **AI-generated market update emails/texts** — using Clozze AI + Firecrawl research to draft comps updates, price change alerts, and listing-related outreach
3. **Manual send first, automation later** — agents review and approve all outbound before any automation is introduced
4. **Integration with connected Gmail and Twilio** — leverage existing OAuth connections for email; Twilio for SMS
5. **Approval controls** — agents stay in control of what gets sent and when; no unsupervised outbound
6. **Communication logging** — every sent message logged inside the relevant buyer or listing record with timestamp and content

## Prerequisites
- Solid completion tracking and guided workflow foundation (Phase 7-8)
- Gmail and Twilio integrations stable
- Clear UX for send approval and message preview

## Build Order (when initiated)
1. Define communication preferences schema (per-record settings)
2. Draft generation from record context (reuse existing AI flows)
3. Manual send via Gmail/Twilio with preview + confirm
4. Logging of sent messages to record
5. Recurring/scheduled sends (later phase)
6. Automation rules with agent approval gates (later phase)
