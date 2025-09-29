import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WelcomeBanner() {
  return (
    <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 mb-8 relative">
      <button className="absolute top-4 right-4 text-text-muted hover:text-text-heading">
        ×
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs">i</span>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-text-heading mb-2">Welcome to Clozze!</h3>
          <p className="text-sm text-text-muted mb-4">
            This dashboard includes sample data and example content to help you get started. All listings, buyers, tasks, and calendar entries shown are placeholders. Replace them with your own information as you begin using Clozze.
          </p>
          
          <Button size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        </div>
      </div>
    </div>
  );
}