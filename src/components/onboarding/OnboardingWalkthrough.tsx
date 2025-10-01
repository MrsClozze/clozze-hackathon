import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingWalkthroughProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to Clozze!",
    description: "Let's take a quick tour of your new real estate CRM. This will only take a minute.",
    highlight: null,
  },
  {
    title: "Active Listings",
    description: "Click on any listing card to view details, upload documents, and track your properties.",
    highlight: "listings",
  },
  {
    title: "Active Buyers",
    description: "Manage your buyer clients here. Click on a buyer card to see their details and preferences.",
    highlight: "buyers",
  },
  {
    title: "Tasks & Calendar",
    description: "Stay organized with tasks and calendar events. Click the '+' button to add new tasks.",
    highlight: "tasks",
  },
  {
    title: "Team Dashboard",
    description: "Access your team's performance metrics and collaborate with other agents on the Team page.",
    highlight: "team",
  },
];

export default function OnboardingWalkthrough({ onComplete }: OnboardingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      toast({
        title: "Welcome aboard! 🎉",
        description: "You're all set to start using Clozze.",
      });
      
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to save onboarding progress.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 animate-fade-in">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text-heading mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-text-body">
              {currentStepData.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleComplete}
            className="ml-4"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <span className="text-sm text-text-body">
            {currentStep + 1} of {steps.length}
          </span>

          {isLastStep ? (
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Finishing..." : "Get Started"}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
