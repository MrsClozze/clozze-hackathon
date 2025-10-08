import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface ListingsOnboardingModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export default function ListingsOnboardingModal({ isOpen, onStartTour, onSkip }: ListingsOnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl bg-gradient-to-br from-background via-background to-primary/5 border-primary/20"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-3xl font-bold">
            Welcome to Listings!
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground">
            Discover how your listings flow through each stage of the process.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-8 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onSkip}
            className="min-w-[140px] transition-all duration-300 hover:scale-105"
          >
            Got It
          </Button>
          <Button
            size="lg"
            onClick={onStartTour}
            className="min-w-[140px] transition-all duration-300 hover:scale-105"
          >
            See Tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
