import { useState } from "react";
import { Settings, X } from "lucide-react";
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
  const [settings, setSettings] = useState<HubSettings>({
    showOnlyActionRequired: true,
    excludeCategories: [],
  });

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
