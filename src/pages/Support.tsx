import { useEffect } from "react";

export default function Support() {
  useEffect(() => {
    // Load Zendesk widget script
    const script = document.createElement("script");
    script.id = "ze-snippet";
    script.src = "https://static.zdassets.com/ekr/snippet.js?key=94614987-dc1f-4600-b492-211a2a24c813";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      const existing = document.getElementById("ze-snippet");
      if (existing) existing.remove();
      // Remove Zendesk iframe/widget elements
      const zendeskElements = document.querySelectorAll('[id^="ze-"], [class*="zEWidget"]');
      zendeskElements.forEach(el => el.remove());
      if ((window as any).zE) {
        try { (window as any).zE('webWidget', 'hide'); } catch {}
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <h1 className="text-3xl font-bold text-foreground mb-4">Support</h1>
      <p className="text-muted-foreground max-w-md">
        Need help? Use the chat widget in the bottom-right corner to search support articles or chat with our AI assistant.
      </p>
    </div>
  );
}
