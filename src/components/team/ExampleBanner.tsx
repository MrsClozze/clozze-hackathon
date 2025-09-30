import { Info, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ExampleBanner() {
  return (
    <Alert className="mb-8 border-2 border-accent-gold/30 bg-gradient-to-r from-accent-gold/5 via-primary/5 to-accent-gold/5 animate-fade-in">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent-gold mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <AlertDescription className="text-text-heading">
            <p className="font-semibold mb-1 flex items-center gap-2">
              <Info className="h-4 w-4" />
              This is an Example Dashboard
            </p>
            <p className="text-sm text-text-body">
              Your personalized Team Dashboard and all metrics will auto-generate once connected agents load their first documents, listings, and buyer clients. The data shown here demonstrates the dashboard&apos;s capabilities using sample information.
            </p>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}