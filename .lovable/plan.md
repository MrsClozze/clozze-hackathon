

## Review of Clozze DocuSign Integration Setup Guide

After reviewing the codebase, here are the accuracy issues and recommended edits for your guide:

### Issues Found

1. **Navigation path is wrong**: The guide says "Settings → Integrations." The actual route is a standalone `/integrations` page accessible from the sidebar navigation (labeled "Apps & Services"), not nested under Settings.

2. **"Send with DocuSign" does not exist**: The current integration only **imports** signer data from existing DocuSign envelopes. There is no feature to compose/send envelopes from within Clozze. The guide's "Sending Documents for Signature" section describes functionality that is not built.

3. **"Resend," "Void," and envelope management do not exist**: The "Managing Envelopes" section describes actions (resend, void) that are not implemented. Users can only view envelope lists and import signer details.

4. **"Automatically stored within the associated transaction" is aspirational**: Completed documents are not auto-downloaded or stored. The integration fetches envelope metadata and recipient info for import into buyer/listing profiles.

5. **DocuSign is currently gated as "Coming Soon"**: In `handleConnect`, clicking Connect DocuSign shows a toast: *"DocuSign integration is coming soon! We're finalizing production access."* This is presumably what you're about to unlock after the review.

### Recommended Revised Guide Text

---

**Clozze DocuSign Integration Setup Guide**

**Overview**

Clozze integrates with DocuSign to help real estate professionals import signer and contact details from their DocuSign envelopes directly into Clozze transaction workspaces. This allows agents to quickly populate buyer, seller, and listing profiles with accurate party information from executed or in-progress contracts.

**Requirements**

- An active Clozze account
- An active DocuSign account

**Connecting Your DocuSign Account**

1. Log in to your Clozze account.
2. Navigate to **Apps & Services** from the sidebar.
3. Click **Connect** on the DocuSign card.
4. A popup window will open redirecting you to DocuSign for authorization.
5. Sign in with your DocuSign credentials and approve access.
6. Once authorized, the DocuSign card will show a connected status.

**Importing from DocuSign**

1. Open a listing or buyer profile in Clozze, or use the Quick Upload feature.
2. Select **Import from DocuSign**.
3. Browse your recent envelopes (up to 90 days).
4. Select an envelope to view its signer details.
5. Confirm the import to populate the profile with the signer's name, email, and role.

**Viewing Envelope Status**

When browsing envelopes during import, Clozze displays:
- Envelope subject and status (sent, delivered, completed, declined, voided)
- Date sent and date completed
- Signer names, emails, and signing status

**Disconnecting**

To disconnect DocuSign, return to Apps & Services and click **Disconnect** on the DocuSign card.

**Support**

For assistance, contact: support@clozze.io

---

### Summary of Changes

| Section | Original | Recommendation |
|---|---|---|
| Navigation | "Settings → Integrations" | "Apps & Services from the sidebar" |
| Sending docs | Full send workflow described | Remove entirely -- not implemented |
| Tracking status | Real-time sync described | Reframe as viewing status during import |
| Managing envelopes | Resend/void actions | Remove -- not implemented |
| Completed docs | Auto-stored in transaction | Remove -- only metadata is imported |
| Connection flow | Generic redirect | Mention popup window (matches implementation) |

This revised text accurately reflects what DocuSign does in Clozze today. If you plan to add send/track/store features before or shortly after the review, you could note them as "coming soon" in the guide, but DocuSign reviewers may test against what's live.

