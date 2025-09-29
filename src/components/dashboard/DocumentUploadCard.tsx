import { Upload, FileText, Plus } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";

export default function DocumentUploadCard() {
  return (
    <BentoCard
      title="Quick Upload"
      subtitle="Upload listing or buyer agreements"
    >
      <div className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-card-border rounded-lg p-6 text-center hover:border-accent-gold/50 transition-all duration-200 cursor-pointer group">
          <Upload className="h-8 w-8 mx-auto mb-3 text-text-muted group-hover:text-accent-gold transition-colors" />
          <p className="text-sm font-medium text-text-heading mb-1">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-text-muted">
            Supports PDF, DOC, DOCX files
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="gap-2 h-12 group"
          >
            <FileText className="h-4 w-4 group-hover:text-accent-gold transition-colors" />
            <div className="text-left">
              <div className="text-sm font-medium">Listing</div>
              <div className="text-xs text-text-muted">Agreement</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="gap-2 h-12 group"
          >
            <FileText className="h-4 w-4 group-hover:text-accent-gold transition-colors" />
            <div className="text-left">
              <div className="text-sm font-medium">Buyer</div>
              <div className="text-xs text-text-muted">Agreement</div>
            </div>
          </Button>
        </div>

        {/* AI Processing Note */}
        <div className="p-3 bg-accent-gold/10 border border-accent-gold/20 rounded-lg">
          <p className="text-xs text-accent-gold font-medium mb-1">
            AI-Powered Processing
          </p>
          <p className="text-xs text-text-muted">
            Documents are automatically parsed to generate transaction cards and task lists
          </p>
        </div>
      </div>
    </BentoCard>
  );
}