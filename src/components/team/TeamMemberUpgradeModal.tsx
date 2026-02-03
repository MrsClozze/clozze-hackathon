import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeamMemberSlots } from "@/hooks/useTeamMemberSlots";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, ArrowRight, AlertCircle, Plus, Minus, Loader2 } from "lucide-react";
import clozzeLogo from "@/assets/clozze-logo.png";

interface TeamMemberUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRICE_PER_SEAT = 9.99;

export default function TeamMemberUpgradeModal({ isOpen, onClose, onSuccess }: TeamMemberUpgradeModalProps) {
  const { subscription, refreshSubscription } = useAuth();
  const { totalSlots, refetch: refetchSlots, loading: slotsLoading } = useTeamMemberSlots();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  
  const hasPro = subscription?.plan_type === 'pro' || 
    subscription?.plan_type === 'team' || 
    (subscription?.plan_type as string) === 'enterprise';

  // Reset seats to add when modal opens
  useEffect(() => {
    if (isOpen) {
      setSeatsToAdd(1);
      refetchSlots();
    }
  }, [isOpen]);

  const handleClose = () => {
    setSeatsToAdd(1);
    onClose();
  };

  const handleIncrement = () => {
    setSeatsToAdd(prev => Math.min(prev + 1, 50)); // Max 50 seats at a time
  };

  const handleDecrement = () => {
    setSeatsToAdd(prev => Math.max(prev - 1, 1)); // Min 1 seat
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 50) {
      setSeatsToAdd(value);
    } else if (e.target.value === '') {
      setSeatsToAdd(1);
    }
  };

  const handleAddSeats = async () => {
    if (!hasPro) {
      toast({
        title: "Pro Account Required",
        description: "Please upgrade to Pro first to add team members.",
        variant: "destructive",
      });
      return;
    }

    if (seatsToAdd < 1) {
      toast({
        title: "Invalid quantity",
        description: "Please select at least 1 seat to add.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Use update-team-seats to add the exact number of seats
      const { data, error } = await supabase.functions.invoke('update-team-seats', {
        body: { 
          action: 'add', 
          quantity: seatsToAdd 
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Team seats added!",
        description: `Successfully added ${seatsToAdd} seat${seatsToAdd > 1 ? 's' : ''} to your subscription. You now have ${data.totalSlots} total seats.`,
      });

      // Refresh subscription and slots data
      await Promise.all([
        refreshSubscription(),
        refetchSlots()
      ]);

      handleClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Add seats error:', error);
      toast({
        title: "Error adding seats",
        description: error.message || "Failed to add team seats. Please try again.",
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

  const newTotalSeats = totalSlots + seatsToAdd;
  const additionalCost = seatsToAdd * PRICE_PER_SEAT;

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
            Add seats to invite team members to your workspace
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
              {/* Current seats info */}
              {slotsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current seats</span>
                    <span className="font-semibold">{totalSlots}</span>
                  </div>
                </div>
              )}

              {/* Seat quantity selector */}
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-heading">
                      Team Member Seats
                    </h4>
                    <p className="text-primary font-semibold">
                      ${PRICE_PER_SEAT.toFixed(2)} per seat / month
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      How many seats to add?
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleDecrement}
                        disabled={seatsToAdd <= 1 || loading}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={seatsToAdd}
                        onChange={handleInputChange}
                        className="w-20 text-center font-semibold"
                        disabled={loading}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleIncrement}
                        disabled={seatsToAdd >= 50 || loading}
                        className="h-10 w-10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-background rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Seats to add</span>
                      <span className="font-medium">{seatsToAdd}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">New total seats</span>
                      <span className="font-medium">{newTotalSeats}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Additional cost</span>
                        <span className="font-semibold text-primary">
                          +${additionalCost.toFixed(2)}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleAddSeats}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading || seatsToAdd < 1}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Seats...
                  </>
                ) : (
                  <>
                    Add {seatsToAdd} Seat{seatsToAdd > 1 ? 's' : ''} • +${additionalCost.toFixed(2)}/mo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Charges will be prorated to your current billing cycle. After adding seats, you can invite team members from this page.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
