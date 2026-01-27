import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BentoCard from "@/components/dashboard/BentoCard";
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
  Plus, 
  Pencil, 
  Trash2, 
  Mail, 
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import TeamMemberUpgradeModal from "./TeamMemberUpgradeModal";

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
  taskCount?: number;
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

interface TeamMemberSlots {
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
}

export default function UnlockedTeamMembers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [slots, setSlots] = useState<TeamMemberSlots>({ totalSlots: 0, usedSlots: 0, availableSlots: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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
      console.log('[UnlockedTeamMembers] User available, fetching data for:', user.id);
      fetchSlots();
      fetchTeamMembers();
      fetchPendingInvitations();
    }
  }, [user]);

  const fetchSlots = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-team-member-slots');
      if (error) throw error;
      setSlots(data);
    } catch (error) {
      console.error('Error fetching slots:', error);
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
        .neq('user_id', user.id); // Exclude self

      if (membersError) throw membersError;

      // Get profiles for members
      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        // Get task counts for each member
        const membersWithData = await Promise.all(members.map(async (member) => {
          const profile = profiles?.find(p => p.id === member.user_id);
          
          // Count tasks assigned to this member
          const { count } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', member.user_id)
            .eq('status', 'pending');

          return {
            ...member,
            profile: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
            } : undefined,
            taskCount: count || 0,
          };
        }));

        setTeamMembers(membersWithData);
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
    if (!user) {
      setInvitationsLoading(false);
      return;
    }
    
    setInvitationsLoading(true);
    try {
      console.log('[UnlockedTeamMembers] Fetching teams for user:', user.id);
      // Get teams where user is owner
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user.id);

      console.log('[UnlockedTeamMembers] Teams query result:', { teams, teamsError });
      
      if (teamsError) throw teamsError;
      if (!teams || teams.length === 0) {
        console.log('[UnlockedTeamMembers] No teams found, setting empty invitations');
        setPendingInvitations([]);
        setInvitationsLoading(false);
        return;
      }

      const teamIds = teams.map(t => t.id);

      // Get pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .in('team_id', teamIds)
        .eq('status', 'pending');

      if (invitationsError) throw invitationsError;
      console.log('[UnlockedTeamMembers] Fetched pending invitations:', invitations);
      setPendingInvitations(invitations || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleAddMember = () => {
    // If no slots purchased yet, or all slots are used, show upgrade modal
    if (slots.totalSlots === 0 || slots.availableSlots <= 0) {
      setShowUpgradeModal(true);
      return;
    }
    setFormData({ firstName: '', lastName: '', email: '' });
    setShowAddModal(true);
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

  const handleViewProfile = (member: TeamMember) => {
    navigate(`/team/member/${member.id}`);
  };

  const submitAddMember = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // First, get or create the user's team
      let teamId: string;
      
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('created_by', user!.id)
        .single();

      if (existingTeam) {
        teamId = existingTeam.id;
      } else {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: 'My Team',
            created_by: user!.id,
          })
          .select()
          .single();

        if (teamError) throw teamError;
        teamId = newTeam.id;
      }

      // Create invitation and get the token
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          invited_by: user!.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select('token')
        .single();

      if (inviteError) throw inviteError;

      // Get inviter's profile for the email
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user!.id)
        .single();

      const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : user!.email?.split('@')[0] || 'A team owner';

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation-email', {
        body: {
          inviteeEmail: formData.email,
          inviteeFirstName: formData.firstName,
          inviteeLastName: formData.lastName,
          inviterName,
          invitationToken: invitation.token,
        },
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${formData.email}.`,
      });

      setShowAddModal(false);
      fetchTeamMembers();
      fetchPendingInvitations();
      fetchSlots();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitEditMember = async () => {
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      // Update profile
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
      fetchSlots();
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
      // Get inviter's profile for the email
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user!.id)
        .single();

      const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : user!.email?.split('@')[0] || 'A team owner';

      // Get the invitation token
      const { data: inviteData, error: inviteError } = await supabase
        .from('team_invitations')
        .select('token')
        .eq('id', invitation.id)
        .single();

      if (inviteError) throw inviteError;

      // Resend invitation email
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

  if (loading || invitationsLoading) {
    return (
      <BentoCard title="Team Members" subtitle="Loading...">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </BentoCard>
    );
  }

  // Show welcome state if no slots purchased yet
  if (slots.totalSlots === 0) {
    return (
      <>
        <BentoCard 
          title="Team Members" 
          subtitle="Add teammates to collaborate"
        >
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-text-heading mb-3">
              Ready to Add Team Members
            </h3>
            <p className="text-text-muted mb-6 max-w-md">
              As a Pro user, you can add team members for $9.99 per user per month. Perfect for bringing on an assistant or colleague to help manage your deals and tasks.
            </p>
            <Button 
              onClick={() => setShowUpgradeModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add a Team Member
            </Button>
          </div>
        </BentoCard>

        <TeamMemberUpgradeModal 
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <BentoCard 
        title="Team Members" 
        subtitle={`${slots.usedSlots} of ${slots.totalSlots} slots used`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Users className="h-4 w-4" />
              <span>{slots.availableSlots} slots available</span>
            </div>
            <Button 
              onClick={handleAddMember}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Team Member
            </Button>
          </div>

          {teamMembers.length === 0 && pendingInvitations.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm">Click "Add Team Member" to invite someone</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active team members */}
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-card-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => handleViewProfile(member)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-heading">
                          {member.profile?.first_name || 'Unknown'} {member.profile?.last_name || ''}
                        </p>
                        {member.status === 'active' ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.profile?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-text-heading">
                        {member.taskCount} active task{member.taskCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditMember(member)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pending invitations */}
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-heading">
                          {invitation.first_name || 'Invited User'} {invitation.last_name || ''}
                        </p>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-warning/10 text-warning flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending Invite
                        </span>
                      </div>
                      <p className="text-sm text-text-muted flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {invitation.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm text-text-muted">
                      <p>Expires {new Date(invitation.expires_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvite(invitation)}
                        disabled={resendingInvite === invitation.id}
                        className="text-primary hover:text-primary/80"
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${resendingInvite === invitation.id ? 'animate-spin' : ''}`} />
                        {resendingInvite === invitation.id ? 'Sending...' : 'Resend'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditInvite(invitation)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty slots for pending invites */}
          {slots.availableSlots > 0 && (
            <div className="space-y-2">
              {Array.from({ length: Math.min(slots.availableSlots, 3) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-card-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={handleAddMember}
                >
                  <div className="text-center text-text-muted">
                    <Plus className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p className="text-sm">Invite Team Member</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </BentoCard>

      {/* Add Member Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Enter the details of the team member you want to invite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <Button 
              onClick={submitAddMember} 
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member's information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email Address</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <Button 
              onClick={submitEditMember} 
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.profile?.first_name} {selectedMember?.profile?.last_name} from your account? 
              Their slot will become available for adding a different team member. Your billing will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveMember}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Invitation Modal */}
      <Dialog open={showEditInviteModal} onOpenChange={setShowEditInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Invitation</DialogTitle>
            <DialogDescription>
              Update the invitation details. After saving, you may want to resend the invite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inviteFirstName">First Name</Label>
                <Input
                  id="inviteFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteLastName">Last Name</Label>
                <Input
                  id="inviteLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <Button 
              onClick={submitEditInvite} 
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <TeamMemberUpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
