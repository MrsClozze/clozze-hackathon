

## Remove `calendar.readonly` Scope from Google OAuth

### Problem
Google's verification team flagged that `calendar.readonly` is showing on the OAuth consent screen but is **not** listed in your Cloud Console submission. Since `calendar.events` already includes full read + write access to calendars, the `calendar.readonly` scope is redundant and must be removed.

### Changes Required

**1. Frontend - `src/hooks/useCalendarConnections.ts`**
Remove `calendar.readonly` from the scopes array (line 113). The remaining scopes will be:
- `calendar.events` (read + write calendar access)
- `userinfo.email` (identify the Google account)

**2. Backend - `supabase/functions/google-calendar-auth/index.ts`**
Remove `calendar.readonly` from the scopes array (line 82). Same two scopes remain.

### Why This Is Safe
- `calendar.events` provides full read and write access, so removing `calendar.readonly` does not reduce any functionality
- All existing sync features (reading events, creating events) will continue to work exactly as before
- This aligns the codebase with the three scopes submitted in Google Cloud Console: `calendar.events`, `gmail.readonly`, and `gmail.send`

### Technical Details
Both edits are single-line removals. No database changes, no new dependencies, no user-facing behavior changes.

