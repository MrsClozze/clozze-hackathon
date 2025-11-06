import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import clozzeLogo from "@/assets/clozze-logo.png";

interface OnboardingModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export default function OnboardingModal({ isOpen, onStartTour, onSkip }: OnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl bg-gradient-to-br from-background via-background to-primary/5 border-primary/20"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-6 text-center flex flex-col items-center">
          <div className="mx-auto w-32 h-32 flex items-center justify-center">
            <img src={clozzeLogo} alt="Clozze Logo" className="h-32 w-32 object-contain" />
          </div>
          <DialogTitle className="text-3xl font-bold text-center">
            Welcome to Clozze! Let's begin with a tour
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground text-center max-w-md mx-auto">
            Discover the key features that will help you manage your real estate business efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-8 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onSkip}
            className="min-w-[120px]"
          >
            Skip
          </Button>
          <Button
            size="lg"
            onClick={onStartTour}
            className="min-w-[120px]"
          >
            Start Tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
