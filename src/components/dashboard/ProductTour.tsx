import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Home, Users, Calendar, CheckSquare, MessageSquare } from "lucide-react";

interface ProductTourProps {
  isOpen: boolean;
  onComplete: () => void;
}

const tourSteps = [
  {
    title: "Active Listings",
    description: "Manage all your property listings in one place. Add new listings, update details, and track their status from active to sold.",
    icon: Home,
    highlight: "Keep track of your entire property portfolio with ease."
  },
  {
    title: "Active Buyers",
    description: "Monitor your buyer relationships, track their preferences, and manage pre-approval amounts and commission details.",
    icon: Users,
    highlight: "Never lose track of a potential buyer again."
  },
  {
    title: "Calendar & Tasks",
    description: "Schedule showings, closings, and important deadlines. Your tasks sidebar keeps you organized and on top of all activities.",
    icon: Calendar,
    highlight: "Stay organized with integrated calendar and task management."
  },
  {
    title: "AI Communication Hub",
    description: "Get AI-powered assistance to craft professional messages, respond to clients, and manage your communications efficiently.",
    icon: MessageSquare,
    highlight: "Let AI help you communicate more effectively."
  }
];

export default function ProductTour({ isOpen, onComplete }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentTourStep = tourSteps[currentStep];
  const Icon = currentTourStep.icon;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
          </div>
          <DialogTitle className="text-2xl">
            {currentTourStep.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {currentTourStep.description}
          </DialogDescription>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
            <p className="text-sm font-medium text-primary">
              {currentTourStep.highlight}
            </p>
          </div>
        </DialogHeader>

        <DialogFooter className="flex-row gap-2 justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="mr-auto"
          >
            Skip Tour
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
              {currentStep < tourSteps.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>
        </DialogFooter>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep 
                  ? "w-8 bg-primary" 
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
