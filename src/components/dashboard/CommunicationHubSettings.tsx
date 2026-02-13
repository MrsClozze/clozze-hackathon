import { useState, useEffect } from "react";
import { Settings, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useToast } from "@/hooks/use-toast";

interface CommunicationHubSettingsProps {
  onSettingsChange?: (settings: HubSettings) => void;
}

export interface HubSettings {
  showOnlyActionRequired: boolean;
  excludeCategories: string[];
}

const CATEGORIES = [
  { id: "marketing", label: "Marketing & Newsletters" },
  { id: "team", label: "Team Communications" },
  { id: "other", label: "Other/Uncategorized" },
];

export default function CommunicationHubSettings({ onSettingsChange }: CommunicationHubSettingsProps) {
  const { isTeamOwner } = useTeamRole();
  const { toast } = useToast();
  const [settings, setSettings] = useState<HubSettings>({
    showOnlyActionRequired: true,
    excludeCategories: [],
  });
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Load the current sharing preference
  useEffect(() => {
    if (!isTeamOwner) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("agent_communication_preferences")
        .select("share_emails_with_team")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setShareWithTeam(data.share_emails_with_team ?? false);
    })();
  }, [isTeamOwner]);

  const handleToggleShare = async (checked: boolean) => {
    setShareLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("agent_communication_preferences")
        .upsert({
          user_id: user.id,
          share_emails_with_team: checked,
        }, { onConflict: "user_id" });

      if (error) throw error;
      setShareWithTeam(checked);
      toast({
        title: checked ? "Email Sharing Enabled" : "Email Sharing Disabled",
        description: checked
          ? "Your team members can now view and respond to your inbound emails."
          : "Your inbound emails are now private.",
      });
    } catch (err: any) {
      console.error("Error toggling email sharing:", err);
      toast({ title: "Error", description: "Failed to update sharing preference.", variant: "destructive" });
    } finally {
      setShareLoading(false);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    const newExcluded = settings.excludeCategories.includes(categoryId)
      ? settings.excludeCategories.filter(c => c !== categoryId)
      : [...settings.excludeCategories, categoryId];
    
    const newSettings = { ...settings, excludeCategories: newExcluded };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Communication Hub Settings</SheetTitle>
          <SheetDescription>
            Customize how your emails and messages are filtered and displayed.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-heading">Filter Preferences</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="action-required">Show only action-required</Label>
                <p className="text-xs text-text-muted">
                  AI filters out newsletters, confirmations, and FYI emails
                </p>
              </div>
              <Switch
                id="action-required"
                checked={settings.showOnlyActionRequired}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, showOnlyActionRequired: checked };
                  setSettings(newSettings);
                  onSettingsChange?.(newSettings);
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-heading">Exclude Categories</h3>
            <p className="text-xs text-text-muted">
              Hide these categories from your Needs Attention view
            </p>
            
            {CATEGORIES.map((category) => (
              <div key={category.id} className="flex items-center justify-between">
                <Label htmlFor={category.id}>{category.label}</Label>
                <Switch
                  id={category.id}
                  checked={settings.excludeCategories.includes(category.id)}
                  onCheckedChange={() => handleToggleCategory(category.id)}
                />
              </div>
            ))}
          </div>

          {isTeamOwner && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-text-heading">Team Email Access</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="share-emails">Share inbound emails with team</Label>
                  <p className="text-xs text-text-muted">
                    When enabled, team members can view and respond to your inbound emails on your behalf.
                  </p>
                </div>
                <Switch
                  id="share-emails"
                  checked={shareWithTeam}
                  disabled={shareLoading}
                  onCheckedChange={handleToggleShare}
                />
              </div>

              {shareWithTeam && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                  ⚠️ Your team members currently have access to view and respond to your inbound emails. Disable this toggle to revoke access.
                </p>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-text-muted">
              Your AI assistant analyzes incoming messages to surface only what needs your attention. 
              Adjust these settings to fine-tune what appears in your queue.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
