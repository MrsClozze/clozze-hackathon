/**
 * Import intent classification for post-import guidance.
 * 
 * High: Signed contracts → immediate transaction prompt
 * Medium: Partial deal context → subtle guidance banner
 * Low: Contacts/manual → silent
 */

export type ImportSource =
  | "file_upload"        // Direct contract upload
  | "docusign_completed" // Completed/signed DocuSign envelope
  | "docusign_sent"      // Sent but not completed envelope
  | "docusign_draft"     // Draft envelope
  | "dotloop_executed"   // Dotloop loop with executed agreement
  | "dotloop_loop"       // Dotloop loop without executed agreement
  | "fub_deal"           // Follow Up Boss deal
  | "fub_contact"        // Follow Up Boss contact
  | "manual"             // Manual entry

export type IntentLevel = "high" | "medium" | "low";

export function classifyImportIntent(source: ImportSource): IntentLevel {
  switch (source) {
    case "file_upload":
    case "docusign_completed":
    case "dotloop_executed":
      return "high";

    case "docusign_sent":
    case "dotloop_loop":
    case "fub_deal":
      return "medium";

    case "docusign_draft":
    case "fub_contact":
    case "manual":
    default:
      return "low";
  }
}

export function getImportSourceLabel(source: ImportSource): string {
  switch (source) {
    case "file_upload": return "uploaded contract";
    case "docusign_completed": return "signed DocuSign envelope";
    case "docusign_sent": return "DocuSign envelope";
    case "dotloop_executed": return "executed Dotloop agreement";
    case "dotloop_loop": return "Dotloop loop";
    case "fub_deal": return "Follow Up Boss deal";
    case "fub_contact": return "Follow Up Boss contact";
    case "manual": return "manual entry";
    default: return "import";
  }
}
