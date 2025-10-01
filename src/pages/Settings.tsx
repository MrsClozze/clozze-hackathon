import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, UserCircle, Shield, Users, CreditCard } from "lucide-react";

export default function Settings() {
  const { user: authUser, subscription, refreshSubscription } = useAuth();
  const { user, refreshUser } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teamInfo, setTeamInfo] = useState<any>(null);

  useEffect(() => {
    if (!authUser) {
      navigate("/auth");
      return;
    }
    
    fetchUserData();
    fetchTeamInfo();
  }, [authUser]);

  const fetchUserData = async () => {
    if (!authUser) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setEmail(profile.email || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchTeamInfo = async () => {
    if (!authUser) return;

    try {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id, role, teams(name)')
        .eq('user_id', authUser.id)
        .eq('status', 'active')
        .single();

      if (teamMember) {
        setTeamInfo(teamMember);
      }
    } catch (error) {
      // User is not part of a team, which is fine
      console.log('No team membership found');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
        })
        .eq('id', authUser.id);

      if (error) throw error;

      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectFromTeam = async () => {
    if (!authUser || !teamInfo) return;

    if (!confirm("Are you sure you want to disconnect from this team? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: 'inactive' })
        .eq('user_id', authUser.id)
        .eq('team_id', teamInfo.team_id);

      if (error) throw error;

      setTeamInfo(null);
      toast.success("Successfully disconnected from team");
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect from team");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        // Refresh subscription after they return
        setTimeout(() => {
          refreshSubscription();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open subscription management");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-heading">Settings</h1>
          <p className="text-text-muted mt-1">Manage your account settings and preferences</p>
        </div>

        {/* User Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              User Details
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-text-muted">Email cannot be changed</p>
              </div>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Billing & Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Subscription
            </CardTitle>
            <CardDescription>Manage your subscription and payment details</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-lg font-semibold mt-1 capitalize">{subscription.plan_type}</p>
                  <p className="text-sm text-text-muted mt-1">Status: <span className="capitalize">{subscription.status}</span></p>
                  {subscription.subscription_end && (
                    <p className="text-sm text-text-muted mt-1">
                      {subscription.status === 'active' ? 'Renews' : 'Ends'}: {new Date(subscription.subscription_end).toLocaleDateString()}
                    </p>
                  )}
                  {subscription.trial_end && subscription.status === 'trial' && (
                    <p className="text-sm text-text-muted mt-1">
                      Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Separator />
                <div className="flex flex-col sm:flex-row gap-2">
                  {subscription.subscribed && (
                    <Button 
                      onClick={handleManageSubscription}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Manage Subscription
                    </Button>
                  )}
                  {(!subscription.subscribed || subscription.plan_type === 'free') && (
                    <Button 
                      onClick={handleUpgrade}
                      disabled={loading}
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  You can manage your subscription, update payment methods, and cancel anytime through the Stripe portal.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-text-muted mb-4">No active subscription</p>
                <Button onClick={handleUpgrade}>View Plans</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>Manage your team membership</CardDescription>
          </CardHeader>
          <CardContent>
            {teamInfo ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Current Team</p>
                  <p className="text-lg font-semibold mt-1">{teamInfo.teams?.name || 'Team'}</p>
                  <p className="text-sm text-text-muted mt-1">Role: {teamInfo.role}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-text-muted">
                    Disconnecting from this team will make your account independent. You can join another team later.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleDisconnectFromTeam}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disconnect from Team
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-text-muted">You are not currently part of any team</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
