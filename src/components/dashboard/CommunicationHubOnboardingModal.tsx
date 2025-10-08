import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface CommunicationHubOnboardingModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export default function CommunicationHubOnboardingModal({ 
  isOpen, 
  onStartTour, 
  onSkip 
}: CommunicationHubOnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl bg-gradient-to-br from-background via-background to-primary/5 border-primary/20"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-3xl font-bold">
            Welcome to Your Communication Hub
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground">
            Introducing your personal AI assistant! Clozze makes it easy for you to manage all your communication in one hub.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-8 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onSkip}
            className="min-w-[140px] transition-all duration-300 hover:scale-105"
          >
            Skip
          </Button>
          <Button
            size="lg"
            onClick={onStartTour}
            className="min-w-[140px] transition-all duration-300 hover:scale-105"
          >
            Take Tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
