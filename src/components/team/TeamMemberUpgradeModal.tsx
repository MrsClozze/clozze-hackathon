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
import { Input } from "@/components/ui/input";
import { Users, Plus, Minus, ArrowRight, AlertCircle } from "lucide-react";
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
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const pricePerMember = 9.99;
  const totalPrice = (quantity * pricePerMember).toFixed(2);
  
  const hasPro = subscription?.plan_type === 'pro' || 
    subscription?.plan_type === 'team' || 
    (subscription?.plan_type as string) === 'enterprise';

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(10, prev + delta)));
  };

  const resetForm = () => {
    setQuantity(1);
  };

  const handleClose = () => {
    resetForm();
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
      // Use the unified update-team-seats function to add seats to existing subscription
      const { data, error } = await supabase.functions.invoke('update-team-seats', {
        body: { action: 'add', quantity }
      });

      if (error) throw error;

      if (data?.error) {
        // Check if user needs to subscribe first
        if (data.error.includes('Pro') || data.error.includes('subscribe')) {
          toast({
            title: "Pro Account Required",
            description: "Please upgrade to Pro first to add team members.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      if (data?.success) {
        toast({
          title: "Team Seats Added",
          description: `You now have ${data.totalSlots} team member seat${data.totalSlots !== 1 ? 's' : ''} available. You can now invite team members from the Team page.`,
        });
        handleClose();
        onSuccess?.();
        window.location.reload();
        return;
      }

      throw new Error("Unexpected response from server");
    } catch (error: any) {
      console.error('Seat update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team member seats. Please try again.",
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
            Add Team Seats
          </DialogTitle>
          <DialogDescription className="text-center text-text-muted">
            Purchase additional seats for your team
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
                      Team Member Add-on
                    </h4>
                    <p className="text-primary font-semibold">
                      $9.99 per seat / month
                    </p>
                  </div>
                </div>
                <p className="text-text-muted text-sm">
                  Purchase seats now, then invite team members from the Team page. Each seat allows one team member to collaborate on your deals and tasks.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">
                  How many seats do you want to add?
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="h-10 w-10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center"
                      min={1}
                      max={10}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= 10}
                      className="h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-text-muted text-sm">
                    {quantity === 1 ? 'seat' : 'seats'}
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">
                    {quantity} seat{quantity !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xl font-bold text-text-heading">
                    ${totalPrice}/month
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Processing...' : `Add ${quantity} Seat${quantity !== 1 ? 's' : ''}`}
              </Button>

              <p className="text-xs text-text-muted text-center">
                Team seats are billed at $9.99/month each and will be prorated on your existing subscription. After purchase, invite team members from the Team page.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
