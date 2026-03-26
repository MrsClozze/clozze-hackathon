import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const bannerClosed = localStorage.getItem('welcomeBannerClosed');
    if (bannerClosed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('welcomeBannerClosed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 mb-8 relative">
      <button 
        onClick={handleClose}
        className="absolute top-4 right-4 text-text-muted hover:text-text-heading transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs">i</span>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-text-heading mb-2">Welcome to Clozze!</h3>
          <p className="text-sm text-text-muted">
            This dashboard includes sample data and example content to help you get started. All listings, buyers, tasks, and calendar entries shown are placeholders. Replace them with your own information as you begin using Clozze.
          </p>
        </div>
      </div>
    </div>
  );
}