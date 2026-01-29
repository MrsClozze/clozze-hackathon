import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Check, ArrowRight, ArrowLeft } from "lucide-react";
import clozzeLogo from "@/assets/clozze-logo.png";
import ImageCropModal from "@/components/onboarding/ImageCropModal";

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
  const { refreshUser } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // Step 1 fields
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [otherRole, setOtherRole] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Step 2 fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedReferral, setSelectedReferral] = useState<string>("");

  // Image cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>("");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setRawImageSrc(previewUrl);
      setCropModalOpen(true);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Create a File from the Blob for upload
    const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
    setAvatarFile(croppedFile);
    
    // Create preview URL for display
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarUrl(previewUrl);
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
    if (!user) {
      console.error('[ONBOARDING] No user found - cannot save');
      toast({
        title: "Error",
        description: "Session expired. Please sign in again.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    console.log('[ONBOARDING] Starting save for user:', user.id);
    setLoading(true);
    
    try {
      let uploadedAvatarUrl = null;
      if (avatarFile) {
        uploadedAvatarUrl = await uploadAvatar();
        console.log('[ONBOARDING] Avatar uploaded:', uploadedAvatarUrl);
      }

      const roleValue = selectedRole === "other" && otherRole ? otherRole : selectedRole;
      const roleLabel = selectedRole === "other" && otherRole 
        ? otherRole 
        : roleOptions.find(r => r.value === selectedRole)?.label || selectedRole;

      const updates: Record<string, unknown> = {
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      if (uploadedAvatarUrl) {
        updates.avatar_url = uploadedAvatarUrl;
      }
      if (phoneNumber) {
        updates.phone = phoneNumber;
      }
      if (roleValue) {
        updates.role = roleValue;
        updates.professional_title = roleLabel;
      }
      if (companyName) {
        updates.company_name = companyName;
      }
      if (licenseNumber) {
        updates.license_number = licenseNumber;
      }
      if (websiteUrl) {
        updates.website_url = websiteUrl;
      }
      if (selectedReferral) {
        updates.referral_source = selectedReferral;
      }

      console.log('[ONBOARDING] Updating profile with:', updates);

      const { error, data } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select();

      console.log('[ONBOARDING] Update result - error:', error, 'data:', data);

      if (error) throw error;

      // Refresh user context so dashboard shows updated data
      console.log('[ONBOARDING] Refreshing user context...');
      await refreshUser();

      toast({
        title: "Profile updated!",
        description: "Your profile has been set up successfully.",
      });

      console.log('[ONBOARDING] Navigating to dashboard...');
      navigate("/");
    } catch (error: unknown) {
      console.error('[ONBOARDING] Error updating profile:', error);
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

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const userInitials = user?.email?.charAt(0).toUpperCase() || "U";
  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg p-8">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-4">
          <img src={clozzeLogo} alt="Clozze" className="h-48 -mb-2" />
          <h1 className="text-2xl font-bold text-text-heading">Let's set up your profile</h1>
          <p className="text-text-muted mt-2 text-center">
            Help us personalize your experience
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-text-muted">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-text-muted">{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
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

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone" className="mb-2 block text-sm font-medium">
                Phone Number <span className="text-text-muted">(optional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
              />
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

            {/* Other Role Text Field */}
            {selectedRole === "other" && (
              <div>
                <Label htmlFor="other-role" className="mb-2 block text-sm font-medium">
                  Please specify your role
                </Label>
                <Input
                  id="other-role"
                  value={otherRole}
                  onChange={(e) => setOtherRole(e.target.value)}
                  placeholder="Enter your role"
                />
              </div>
            )}

            {/* Company Name */}
            {selectedRole && (
              <div>
                <Label htmlFor="company" className="mb-2 block text-sm font-medium">
                  Company / Brokerage Name <span className="text-text-muted">(optional)</span>
                </Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company or brokerage name"
                />
              </div>
            )}

            {/* Next Button */}
            <Button
              onClick={handleNext}
              className="w-full transition-all duration-300 hover:shadow-lg hover:brightness-110"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Additional Info */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* License Number */}
            <div>
              <Label htmlFor="license" className="mb-2 block text-sm font-medium">
                Real Estate License Number <span className="text-text-muted">(optional)</span>
              </Label>
              <Input
                id="license"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Enter your license number"
              />
            </div>

            {/* Website URL */}
            <div>
              <Label htmlFor="website" className="mb-2 block text-sm font-medium">
                Website / Social Media <span className="text-text-muted">(optional)</span>
              </Label>
              <Input
                id="website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://your-website.com or social profile link"
              />
            </div>

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

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 transition-all duration-300 hover:shadow-lg hover:brightness-110"
                disabled={loading}
              >
                {loading ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}

        {/* Skip Option */}
        <div className="text-center mt-6">
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
      </Card>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={rawImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
