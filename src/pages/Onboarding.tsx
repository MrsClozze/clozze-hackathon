import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Check } from "lucide-react";
import clozzeLogo from "@/assets/clozze-logo.png";

const roleOptions = [
  { value: "real_estate_agent", label: "Real Estate Agent" },
  { value: "realtor", label: "Realtor" },
  { value: "assistant", label: "Assistant" },
  { value: "transaction_coordinator", label: "Transaction Coordinator" },
  { value: "other", label: "Other" },
];

const referralOptions = [
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "reddit", label: "Reddit" },
  { value: "twitter", label: "Twitter" },
  { value: "email", label: "Email" },
  { value: "google", label: "Google" },
  { value: "other", label: "Other" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [selectedReferral, setSelectedReferral] = useState<string>("");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let uploadedAvatarUrl = null;
      if (avatarFile) {
        uploadedAvatarUrl = await uploadAvatar();
      }

      const updates: Record<string, unknown> = {
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      if (uploadedAvatarUrl) {
        updates.avatar_url = uploadedAvatarUrl;
      }
      if (selectedRole) {
        updates.role = selectedRole;
        updates.professional_title = roleOptions.find(r => r.value === selectedRole)?.label || selectedRole;
      }
      if (companyName) {
        updates.company_name = companyName;
      }
      if (selectedReferral) {
        updates.referral_source = selectedReferral;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your profile has been set up successfully.",
      });

      navigate("/");
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      navigate("/");
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const userInitials = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={clozzeLogo} alt="Clozze" className="h-24 mb-4" />
          <h1 className="text-2xl font-bold text-text-heading">Complete Your Profile</h1>
          <p className="text-text-muted mt-2 text-center">
            Help us personalize your experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center">
            <Label className="mb-3 text-sm font-medium">Profile Photo</Label>
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <p className="text-xs text-text-muted mt-2">Click the camera to upload</p>
          </div>

          {/* Role Selection */}
          <div>
            <Label className="mb-3 block text-sm font-medium">What best describes your role?</Label>
            <div className="grid grid-cols-2 gap-2">
              {roleOptions.map((role) => (
                <Button
                  key={role.value}
                  type="button"
                  variant="outline"
                  className={`h-auto py-3 px-4 justify-start ${
                    selectedRole === role.value
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary border-border hover:bg-primary/5 hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  {selectedRole === role.value && (
                    <Check className="h-4 w-4 mr-2 shrink-0" />
                  )}
                  <span className="text-sm">{role.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Company Name */}
          {selectedRole && (
            <div>
              <Label htmlFor="company" className="mb-2 block text-sm font-medium">
                Company Name <span className="text-text-muted">(optional)</span>
              </Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company or brokerage name"
              />
            </div>
          )}

          {/* Referral Source */}
          <div>
            <Label className="mb-3 block text-sm font-medium">How did you hear about us?</Label>
            <div className="grid grid-cols-3 gap-2">
              {referralOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-auto py-2 px-3 ${
                    selectedReferral === option.value
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary border-border hover:bg-primary/5 hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedReferral(option.value)}
                >
                  {selectedReferral === option.value && (
                    <Check className="h-3 w-3 mr-1 shrink-0" />
                  )}
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full transition-all duration-300 hover:shadow-lg hover:brightness-110"
            disabled={loading}
          >
            {loading ? "Saving..." : "Complete Setup"}
          </Button>

          {/* Skip Option */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={loading}
              className="text-text-muted hover:text-text-heading"
            >
              Skip
            </Button>
            <p className="text-xs text-text-muted mt-1">
              Fill out later in user settings
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
