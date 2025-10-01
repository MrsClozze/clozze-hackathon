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
import { Loader2, UserCircle, Shield, Users, CreditCard, Upload, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Settings() {
  const { user: authUser, subscription, refreshSubscription } = useAuth();
  const { user, refreshUser } = useUser();
  const navigate = useNavigate();
  const isSSO = !!authUser?.app_metadata?.providers?.some((p: string) => p === 'google' || p === 'google_oidc');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [brokerLicenseNumber, setBrokerLicenseNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [currentEmailPassword, setCurrentEmailPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

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
        .select('first_name, last_name, email, avatar_url, professional_title, license_number, broker_license_number')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setEmail(profile.email || '');
        setAvatarUrl(profile.avatar_url || '');
        setProfessionalTitle(profile.professional_title || '');
        setLicenseNumber(profile.license_number || '');
        setBrokerLicenseNumber(profile.broker_license_number || '');
      }

      // Check if there's a pending email change
      if (authUser.email !== authUser.new_email && authUser.new_email) {
        setPendingEmail(authUser.new_email);
      } else {
        setPendingEmail(null);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!authUser || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${authUser.id}/${fileName}`;

    setUploading(true);
    try {
      // Delete old avatar if exists
      if (avatarUrl) {
        try {
          const oldPath = avatarUrl.split('/storage/v1/object/public/avatars/')[1];
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (error) {
          console.log('Error removing old avatar:', error);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      // Update local state immediately
      setAvatarUrl(publicUrl);
      await refreshUser();
      toast.success("Profile picture updated successfully");
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!authUser || !avatarUrl) return;

    setUploading(true);
    try {
      const filePath = avatarUrl.split('/storage/v1/object/public/avatars/')[1];
      
      if (filePath) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      setAvatarUrl('');
      await refreshUser();
      toast.success("Profile picture removed");
    } catch (error: any) {
      console.error('Avatar removal error:', error);
      toast.error(error.message || "Failed to remove profile picture");
    } finally {
      setUploading(false);
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
          professional_title: professionalTitle,
          license_number: licenseNumber,
          broker_license_number: brokerLicenseNumber,
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

  const handleChangeEmail = async () => {
    if (!authUser) return;
    if (isSSO) {
      toast.error("Disconnect Google before changing your email");
      return;
    }
    if (email === authUser.email) {
      toast.error("Please enter a different email address");
      return;
    }
    if (!currentEmailPassword) {
      toast.error("Please enter your current password to change email");
      return;
    }

    setEmailLoading(true);
    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email || "",
        password: currentEmailPassword,
      });
      if (signInError) throw new Error("Current password is incorrect");

      // Request email change - this sends a verification email to the NEW address
      const redirectUrl = `${window.location.origin}/settings`;
      const { error: updateError } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: redirectUrl }
      );
      if (updateError) throw updateError;

      // Set pending email state
      setPendingEmail(email);
      setCurrentEmailPassword("");
      
      toast.success(
        "Verification email sent! Check your NEW email inbox and click the confirmation link to complete the change.",
        { duration: 8000 }
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to request email change");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword("");
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
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Profile Picture Section */}
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} alt={`${firstName} ${lastName}`} />
                    <AvatarFallback className="text-lg">
                      {firstName?.[0]}{lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </>
                        )}
                      </Button>
                      {avatarUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          onClick={handleRemoveAvatar}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">JPG, PNG or WEBP (max 2MB)</p>
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>

              <Separator />

              {/* Basic Information */}
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
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSSO || !!pendingEmail}
                  className={isSSO || pendingEmail ? "bg-muted" : ""}
                />
                
                {pendingEmail && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Email change pending verification
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      A verification link has been sent to <strong>{pendingEmail}</strong>. 
                      Click the link in that email to confirm the change. Your current email ({authUser?.email}) remains active until then.
                    </p>
                  </div>
                )}
                
                {isSSO ? (
                  <div className="text-xs text-text-muted flex items-center gap-2">
                    <span>This account is connected with Google. Disconnect to change email.</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate('/integrations')}>
                      Open Integrations
                    </Button>
                  </div>
                ) : !pendingEmail && (
                  <div className="space-y-2">
                    <p className="text-xs text-text-muted">
                      <strong>To change your email:</strong> Enter a new email address and your current password below. 
                      You'll receive a verification link at the NEW email address that you must click to complete the change.
                    </p>
                    {authUser && email !== authUser.email && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          id="currentEmailPassword"
                          type="password"
                          value={currentEmailPassword}
                          onChange={(e) => setCurrentEmailPassword(e.target.value)}
                          placeholder="Current password (required)"
                          className="sm:max-w-xs"
                        />
                        <Button type="button" onClick={handleChangeEmail} disabled={emailLoading}>
                          {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send Verification Email
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Professional Information */}
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Professional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="professionalTitle">Professional Title</Label>
                  <Input
                    id="professionalTitle"
                    value={professionalTitle}
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                    placeholder="e.g., Real Estate Agent, Team Lead"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="Enter license number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brokerLicenseNumber">Broker License Number</Label>
                    <Input
                      id="brokerLicenseNumber"
                      value={brokerLicenseNumber}
                      onChange={(e) => setBrokerLicenseNumber(e.target.value)}
                      placeholder="Enter broker license number"
                    />
                  </div>
                </div>
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
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
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
