import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import appleCalendarLogo from "@/assets/apple-calendar-logo.png";

interface AppleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (appleId: string, password: string) => Promise<boolean>;
}

export function AppleCalendarModal({ 
  isOpen, 
  onClose, 
  onConnect 
}: AppleCalendarModalProps) {
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!appleId || !appPassword) return;
    setConnecting(true);
    const success = await onConnect(appleId, appPassword);
    setConnecting(false);
    if (success) {
      setAppleId("");
      setAppPassword("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border border-card-border">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <img src={appleCalendarLogo} alt="Apple Calendar" className="w-10 h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">Connect Apple Calendar</DialogTitle>
          <DialogDescription className="text-center">
            To connect your Apple Calendar, you'll need to use an App-Specific Password. 
            <a 
              href="https://support.apple.com/en-us/102654" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              Learn how to create one
            </a>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="apple-id">Apple ID (Email)</Label>
            <Input
              id="apple-id"
              type="email"
              value={appleId}
              onChange={(e) => setAppleId(e.target.value)}
              placeholder="your@icloud.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="app-password">App-Specific Password</Label>
            <Input
              id="app-password"
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="mt-1"
            />
            <p className="text-xs text-text-muted mt-1">
              This is NOT your Apple ID password. Create an app-specific password at appleid.apple.com
            </p>
          </div>
          <Button 
            onClick={handleConnect} 
            disabled={!appleId || !appPassword || connecting}
            className="w-full"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Apple Calendar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
