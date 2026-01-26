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
import { Label } from "@/components/ui/label";
import { Users, Plus, Minus, ArrowRight, AlertCircle } from "lucide-react";
import clozzeLogo from "@/assets/clozze-logo.png";

interface TeamMemberUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamMemberUpgradeModal({ isOpen, onClose }: TeamMemberUpgradeModalProps) {
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
      const { data, error } = await supabase.functions.invoke('create-team-member-checkout', {
        body: { quantity }
      });

      if (error) throw error;

      if (data?.requiresPro) {
        toast({
          title: "Pro Account Required",
          description: "Please upgrade to Pro first to add team members.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToPro = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={clozzeLogo} alt="Clozze" className="w-20 h-20" />
          </div>
          <DialogTitle className="text-xl font-semibold text-center">
            Add Team Members
          </DialogTitle>
          <DialogDescription className="text-center text-text-muted">
            Expand your team to collaborate on deals and tasks
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
                    Adding team members is only available to users with an active Pro account at $9.99/month. Upgrade to Pro first, then come back to add team members.
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
                      $9.99 per user / month
                    </p>
                  </div>
                </div>
                <p className="text-text-muted text-sm">
                  Perfect for bringing on an assistant or colleague to help manage your deals and tasks. Each team member can be assigned tasks and access shared resources.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  How many team members do you want to add?
                </Label>
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
                    {quantity === 1 ? 'team member' : 'team members'}
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">
                    {quantity} team member{quantity !== 1 ? 's' : ''}
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
                {loading ? 'Processing...' : `Add ${quantity} Team Member${quantity !== 1 ? 's' : ''}`}
              </Button>

              <p className="text-xs text-text-muted text-center">
                You will be redirected to our secure payment processor. This is in addition to your Pro subscription.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
