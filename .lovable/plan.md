

# Add HTML Output Encoding to 4 Email Edge Functions

## Summary
Four email edge functions interpolate user-provided values (like `displayName`) directly into HTML templates without escaping. This creates a potential XSS vector in email clients. The fix is to add the same `escapeHtml()` utility already used in `send-team-invitation-email` and `docusign-callback`.

## Changes

### 1. `supabase/functions/send-welcome-email/index.ts`
- Add the `escapeHtml()` function (copy from existing pattern)
- Escape `displayName` before interpolation into the HTML body

### 2. `supabase/functions/send-verification-email/index.ts`
- Add the `escapeHtml()` function
- Escape `displayName` before interpolation
- Escape `verificationLink` before placing it in visible text (the `href` attribute is safe as URLs are server-generated, but the visible text rendition should be escaped)

### 3. `supabase/functions/send-password-reset-email/index.ts`
- Add the `escapeHtml()` function
- Escape `displayName` before interpolation
- Escape `resetLink` in the visible text paragraph

### 4. `supabase/functions/send-password-reset-confirmation/index.ts`
- Add the `escapeHtml()` function
- Escape `displayName` before interpolation
- Escape `loginLink` in the button href (server-generated but for consistency)

## Technical Details

The `escapeHtml` function to add in each file:

```typescript
const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (ch) => htmlEscapes[ch]);
};
```

Usage pattern in each function -- wrap user-derived values before template interpolation:
```typescript
const safeDisplayName = escapeHtml(displayName);
// Then use safeDisplayName in the HTML template instead of displayName
```

No database changes or new dependencies required. The edge functions will be redeployed automatically.

