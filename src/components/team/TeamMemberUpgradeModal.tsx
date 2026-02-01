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
  onSuccess?: () => void;
}

export default function TeamMemberUpgradeModal({ isOpen, onClose, onSuccess }: TeamMemberUpgradeModalProps) {
  const { subscription, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Member info fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

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
    setFirstName('');
    setLastName('');
    setEmail('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const sendInvitation = async () => {
    if (!user) return;
    
    try {
      // Get or create the user's team
      let teamId: string;
      
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id)
        .single();

      if (existingTeam) {
        teamId = existingTeam.id;
      } else {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: 'My Team',
            created_by: user.id,
          })
          .select()
          .single();

        if (teamError) throw teamError;
        teamId = newTeam.id;
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('token')
        .single();

      if (inviteError) throw inviteError;

      // Get inviter's profile
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : user.email?.split('@')[0] || 'A team owner';

      // Send invitation email
      await supabase.functions.invoke('send-team-invitation-email', {
        body: {
          inviteeEmail: email,
          inviteeFirstName: firstName,
          inviteeLastName: lastName,
          inviterName,
          invitationToken: invitation.token,
        },
      });

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${email}.`,
      });
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Note",
        description: "Slots added successfully. You can send the invitation from the Team page.",
      });
    }
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

    // Validate member info
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all team member fields.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
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

      // Handle internal users who get slots granted directly
      if (data?.internalUser && data?.success) {
        // Send the invitation immediately for internal users
        await sendInvitation();
        
        toast({
          title: "Team Member Slots Added",
          description: `You now have ${data.totalSlots} team member slot${data.totalSlots !== 1 ? 's' : ''} available.`,
        });
        handleClose();
        onSuccess?.();
        window.location.reload();
        return;
      }

      if (data?.url) {
        // Store pending invitation in sessionStorage to send after checkout
        sessionStorage.setItem('pendingTeamInvite', JSON.stringify({
          firstName,
          lastName,
          email,
        }));
        window.open(data.url, '_blank');
        handleClose();
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
    handleClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                  Perfect for bringing on an assistant or colleague to help manage your deals and tasks.
                </p>
              </div>

              {/* Team member details */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Team Member Details</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs text-text-muted">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs text-text-muted">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-text-muted">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
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
