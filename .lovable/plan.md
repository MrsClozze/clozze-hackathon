
## Hide Zendesk Chat Widget on the Sign-In Page

### Problem
The Zendesk chat widget currently appears on every page, including the sign-in (`/auth`) page where it's unnecessary and potentially distracting.

### Approach
Since the Zendesk widget is loaded globally in `RootLayout.tsx`, we'll add route-awareness to hide it on the `/auth` page (and optionally `/reset-password` and `/onboarding` pages too).

### Changes

**1. `src/components/layout/RootLayout.tsx`**
- Import `useLocation` from `react-router-dom`
- After the Zendesk script loads, use a second `useEffect` that watches the current route
- When on `/auth`, call the Zendesk API to hide the widget: `window.zE?.('messenger', 'hide')`
- On all other routes, show it again: `window.zE?.('messenger', 'show')`

This is a single-file change with no impact on other functionality. The widget will simply be hidden when the user is on the sign-in page and automatically reappear on all other pages.
