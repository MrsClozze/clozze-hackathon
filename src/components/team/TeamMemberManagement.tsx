import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Pencil, 
  Trash2, 
  Mail, 
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2
} from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface PendingInvitation {
  id: string;
  team_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface TeamMemberManagementProps {
  compact?: boolean;
  showPendingInvitations?: boolean;
}

export default function TeamMemberManagement({ 
  compact = false,
  showPendingInvitations = true 
}: TeamMemberManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showEditInviteModal, setShowEditInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<PendingInvitation | null>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      checkOwnerStatus();
      fetchTeamMembers();
      if (showPendingInvitations) {
        fetchPendingInvitations();
      }
    }
  }, [user]);

  const checkOwnerStatus = async () => {
    if (!user) return;
    
    try {
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id);
      
      setIsOwner(!!teams && teams.length > 0);
    } catch (error) {
      console.error('Error checking owner status:', error);
    }
  };

  const fetchTeamMembers = async () => {
    if (!user) return;
    
    try {
      // Get teams where user is owner
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id);

      if (teamsError) throw teamsError;
      if (!teams || teams.length === 0) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      const teamIds = teams.map(t => t.id);

      // Get team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .in('team_id', teamIds)
        .neq('user_id', user.id);

      if (membersError) throw membersError;

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        const membersWithProfiles = members.map((member) => {
          const profile = profiles?.find(p => p.id === member.user_id);
          return {
            ...member,
            profile: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
            } : undefined,
          };
        });

        setTeamMembers(membersWithProfiles);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    if (!user) return;
    
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id);

      if (teamsError) throw teamsError;
      if (!teams || teams.length === 0) {
        setPendingInvitations([]);
        return;
      }

      const teamIds = teams.map(t => t.id);

      const { data: invitations, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .in('team_id', teamIds)
        .eq('status', 'pending');

      if (invitationsError) throw invitationsError;
      setPendingInvitations(invitations || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setFormData({
      firstName: member.profile?.first_name || '',
      lastName: member.profile?.last_name || '',
      email: member.profile?.email || '',
    });
    setShowEditModal(true);
  };

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowRemoveDialog(true);
  };

  const submitEditMember = async () => {
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
        })
        .eq('id', selectedMember.user_id);

      if (error) throw error;

      toast({
        title: "Member Updated",
        description: "Team member information has been updated.",
      });

      setShowEditModal(false);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update member.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemoveMember = async () => {
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', selectedMember.id);

      if (error) throw error;

      toast({
        title: "Member Removed",
        description: "Team member has been removed. Their slot is now available.",
      });

      setShowRemoveDialog(false);
      setSelectedMember(null);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove member.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (invitation: PendingInvitation) => {
    setResendingInvite(invitation.id);
    try {
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user!.id)
        .single();

      const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : user!.email?.split('@')[0] || 'A team owner';

      const { data: inviteData, error: inviteError } = await supabase
        .from('team_invitations')
        .select('token')
        .eq('id', invitation.id)
        .single();

      if (inviteError) throw inviteError;

      const { error: emailError } = await supabase.functions.invoke('send-team-invitation-email', {
        body: {
          inviteeEmail: invitation.email,
          inviteeFirstName: invitation.first_name || '',
          inviteeLastName: invitation.last_name || '',
          inviterName,
          invitationToken: inviteData.token,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Invitation Resent",
        description: `A new invitation email has been sent to ${invitation.email}.`,
      });
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation.",
        variant: "destructive",
      });
    } finally {
      setResendingInvite(null);
    }
  };

  const handleEditInvite = (invitation: PendingInvitation) => {
    setSelectedInvitation(invitation);
    setFormData({
      firstName: invitation.first_name || '',
      lastName: invitation.last_name || '',
      email: invitation.email,
    });
    setShowEditInviteModal(true);
  };

  const submitEditInvite = async () => {
    if (!selectedInvitation) return;

    if (!formData.email) {
      toast({
        title: "Missing Information",
        description: "Email address is required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
        })
        .eq('id', selectedInvitation.id);

      if (error) throw error;

      toast({
        title: "Invitation Updated",
        description: "The invitation details have been updated. You may want to resend the invite.",
      });

      setShowEditInviteModal(false);
      setSelectedInvitation(null);
      fetchPendingInvitations();
    } catch (error: any) {
      console.error('Error updating invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update invitation.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  const hasMembers = teamMembers.length > 0 || pendingInvitations.length > 0;

  if (!hasMembers) {
    return (
      <div className="text-center py-4 text-text-muted">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No team members yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Active team members */}
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className={`flex items-center justify-between p-3 rounded-lg bg-background/50 border border-card-border ${
              compact ? '' : 'hover:border-primary/30 transition-colors'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-heading text-sm">
                    {member.profile?.first_name || 'Unknown'} {member.profile?.last_name || ''}
                  </p>
                  {member.status === 'active' && (
                    <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success flex items-center gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <Mail className="h-2.5 w-2.5" />
                  {member.profile?.email || 'No email'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditMember(member)}
                className="h-7 w-7"
                title="Edit member details"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMember(member)}
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Remove member"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {/* Pending invitations */}
        {showPendingInvitations && pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-warning" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-heading text-sm">
                    {invitation.first_name || 'Invited User'} {invitation.last_name || ''}
                  </p>
                  <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    Pending
                  </span>
                </div>
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <Mail className="h-2.5 w-2.5" />
                  {invitation.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleResendInvite(invitation)}
                disabled={resendingInvite === invitation.id}
                className="h-7 w-7"
                title="Resend invitation"
              >
                {resendingInvite === invitation.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditInvite(invitation)}
                className="h-7 w-7"
                title="Edit invitation"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member's profile information. This will change their account details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitEditMember} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {selectedMember?.profile?.first_name} {selectedMember?.profile?.last_name}
              </strong>{' '}
              from your team? Their slot will become available for a new member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Invitation Modal */}
      <Dialog open={showEditInviteModal} onOpenChange={setShowEditInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invitation</DialogTitle>
            <DialogDescription>
              Update the invitation details. You may want to resend the invitation after making changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-firstName">First Name</Label>
              <Input
                id="invite-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-lastName">Last Name</Label>
              <Input
                id="invite-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitEditInvite} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
