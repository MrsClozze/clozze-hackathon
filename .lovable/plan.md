

# Enforce 12-Character Minimum Password Requirement

## Summary
Update all password fields across the application to require a minimum of 12 characters, aligning with CASA Tier 2 security requirements.

## Changes Required

### 1. Auth Page (`src/pages/Auth.tsx`)
- Change `minLength={6}` to `minLength={12}` on the password input (line ~531)

### 2. Reset Password Page (`src/pages/ResetPassword.tsx`)
- Change `minLength={6}` to `minLength={12}` on both password inputs (lines ~376, ~390)
- Update validation check from `< 6` to `< 12` (line ~206)
- Update error message and placeholder text to say "12 characters"

### 3. Settings Page (`src/pages/Settings.tsx`)
- Change validation check from `< 6` to `< 12` (line ~330)
- Update error message to say "12 characters"

### Technical Notes
- The authentication platform enforces its own server-side minimum (default 6). The frontend will enforce the stricter 12-character requirement, ensuring no password shorter than 12 characters is ever submitted. If the server-side config can be updated to match, that would provide defense-in-depth, but the frontend gate is sufficient for CASA compliance since the API only receives passwords that already pass client validation.
- No database migrations are needed.
- No edge function changes are needed.

