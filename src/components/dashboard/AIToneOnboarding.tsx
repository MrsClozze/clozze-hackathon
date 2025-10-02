import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const trainingScenarios = [
  {
    id: 1,
    scenario: "The inspector sent you a report noting minor roof issues. How would you respond to your client?",
  },
  {
    id: 2,
    scenario: "A buyer asks if they should make an offer $20k over asking price in this market. How do you respond?",
  },
  {
    id: 3,
    scenario: "Your client wants to schedule a showing for this Saturday at 2 PM. How do you confirm?",
  },
];

export default function AIToneOnboarding() {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isTraining, setIsTraining] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const handleSubmitResponse = async () => {
    if (!currentResponse.trim()) {
      toast({
        title: "Empty Response",
        description: "Please provide a response to continue training.",
        variant: "destructive",
      });
      return;
    }

    const newResponses = [...responses, currentResponse];
    setResponses(newResponses);
    setCurrentResponse("");

    if (currentScenario < trainingScenarios.length - 1) {
      setCurrentScenario(currentScenario + 1);
      toast({
        title: "Response Recorded",
        description: `${trainingScenarios.length - currentScenario - 1} scenarios remaining`,
      });
    } else {
      // Training complete
      setIsTraining(true);
      try {
        const { error } = await supabase.functions.invoke("train-ai-tone", {
          body: {
            scenarios: trainingScenarios.map((s, i) => ({
              scenario: s.scenario,
              response: newResponses[i],
            })),
          },
        });

        if (error) throw error;

        setIsComplete(true);
        toast({
          title: "Training Complete!",
          description: "Your AI assistant has learned your communication style.",
        });
      } catch (error) {
        console.error("Error training AI tone:", error);
        toast({
          title: "Training Failed",
          description: "Could not complete tone training. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsTraining(false);
      }
    }
  };

  const handleSkip = () => {
    toast({
      title: "Training Skipped",
      description: "You can complete this training anytime from the Communication Hub.",
    });
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <Card className="p-6 bg-accent-gold/5 border-accent-gold/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-accent-gold/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-accent-gold" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-heading">
              AI Tone Training Complete
            </h3>
            <p className="text-sm text-text-muted">
              Your AI assistant is now trained to match your communication style
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-accent-gold/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-accent-gold" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-heading">
            Train Your AI Assistant
          </h3>
          <p className="text-sm text-text-muted">
            Help the AI learn your communication style and tone
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-text-muted mb-2">
          <span>Scenario {currentScenario + 1} of {trainingScenarios.length}</span>
          <span>{Math.round(((currentScenario) / trainingScenarios.length) * 100)}% Complete</span>
        </div>
        <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-gold transition-all duration-300"
            style={{ width: `${((currentScenario) / trainingScenarios.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Scenario */}
      <div className="space-y-4">
        <div className="bg-background-elevated rounded-lg p-4 border border-card-border">
          <p className="text-sm text-text-heading font-medium mb-2">Scenario:</p>
          <p className="text-sm text-text-body">
            {trainingScenarios[currentScenario].scenario}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-text-heading mb-2 block">
            Your Response:
          </label>
          <Textarea
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            placeholder="Type how you would naturally respond..."
            className="min-h-[120px] resize-none"
          />
        </div>

        <div className="flex justify-between gap-3">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Training
          </Button>
          <Button onClick={handleSubmitResponse} disabled={isTraining}>
            {isTraining ? (
              "Training AI..."
            ) : currentScenario < trainingScenarios.length - 1 ? (
              "Next Scenario"
            ) : (
              "Complete Training"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
