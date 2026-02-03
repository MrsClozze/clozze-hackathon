import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, AlertCircle } from "lucide-react";
import clozzeLogo from "@/assets/clozze-logo.png";

interface TeamMemberUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TeamMemberUpgradeModal({ isOpen, onClose, onSuccess }: TeamMemberUpgradeModalProps) {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const hasPro = subscription?.plan_type === 'pro' || 
    subscription?.plan_type === 'team' || 
    (subscription?.plan_type as string) === 'enterprise';

  const handleClose = () => {
    onClose();
  };

  const handleCheckout = async () => {
    if (!hasPro) {
      toast({
        title: "Pro Account Required",
        description: "Please upgrade to Pro first to add team members.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Redirect to Stripe Customer Portal to manage subscription and add seats
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.url) {
        // Open Customer Portal in new tab - user can add seats there
        window.open(data.url, '_blank');
        handleClose();
        toast({
          title: "Opening Subscription Management",
          description: "Update your team seats in the Stripe portal. Changes will sync automatically.",
        });
        return;
      }

      throw new Error("No portal URL returned");
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToPro = () => {
    handleClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img src={clozzeLogo} alt="Clozze" className="h-32 w-auto" />
          </div>
          <DialogTitle className="text-xl font-semibold text-center">
            Manage Team Seats
          </DialogTitle>
          <DialogDescription className="text-center text-text-muted">
            Add or modify team seats through your subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!hasPro ? (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-text-heading text-sm">
                    Pro Account Required
                  </h4>
                  <p className="text-text-muted text-sm mt-1">
                    Adding team members is only available to users with an active Pro account at $9.99/month. Upgrade to Pro first, then come back to add team seats.
                  </p>
                  <Button 
                    onClick={handleUpgradeToPro}
                    className="mt-3 bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    Upgrade to Pro
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-heading">
                      Team Member Seats
                    </h4>
                    <p className="text-primary font-semibold">
                      $9.99 per seat / month
                    </p>
                  </div>
                </div>
                <p className="text-text-muted text-sm">
                  Add team seats through the Stripe subscription portal. You'll be able to increase or decrease seats, and charges will be prorated automatically.
                </p>
              </div>

              <Button 
                onClick={handleCheckout}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Opening Portal...' : 'Manage Team Seats'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-text-muted text-center">
                After adding seats, return here to invite team members. Changes sync automatically.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
