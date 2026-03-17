

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

