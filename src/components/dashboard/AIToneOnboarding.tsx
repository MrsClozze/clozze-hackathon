import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const trainingScenarios = [
  {
    id: 1,
    type: "text",
    question: "How do you typically address and communicate with general clients?",
    placeholder: "Describe your tone, formality level, and communication style...",
  },
  {
    id: 2,
    type: "text",
    question: "How do you communicate with listing clients specifically?",
    placeholder: "Focus on your priorities and approach...",
  },
  {
    id: 3,
    type: "text",
    question: "What's your communication style with buyer clients?",
    placeholder: "Describe how you guide and pace conversations...",
  },
  {
    id: 4,
    type: "text",
    question: "How do you communicate with preferred lenders?",
    placeholder: "Describe your professional tone and approach...",
  },
  {
    id: 5,
    type: "text",
    question: "What's your communication style with title companies?",
    placeholder: "How do you typically interact with title companies...",
  },
  {
    id: 6,
    type: "text",
    question: "How do you communicate with insurance agents?",
    placeholder: "Describe your approach and tone...",
  },
  {
    id: 7,
    type: "text",
    question: "What's your communication style with co-workers and team members?",
    placeholder: "How do you communicate internally...",
  },
  {
    id: 8,
    type: "booking_link",
    question: "Do you use a booking link for clients to schedule time with you?",
  },
  {
    id: 9,
    type: "preferred_email",
    question: "Do you have a preferred communication email?",
  },
  {
    id: 10,
    type: "text",
    question: "Any additional preferences about your communication frequency or general tone?",
    placeholder: "Add any other details about how you prefer to communicate...",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function AIToneOnboarding({ onComplete }: OnboardingProps) {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentResponse, setCurrentResponse] = useState("");
  const [bookingLinkChoice, setBookingLinkChoice] = useState<string>("");
  const [bookingLinkUrl, setBookingLinkUrl] = useState("");
  const [emailChoice, setEmailChoice] = useState<string>("");
  const [preferredEmail, setPreferredEmail] = useState("");
  const [isTraining, setIsTraining] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingPreferences();
  }, []);

  const checkExistingPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('agent_communication_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data?.onboarding_completed) {
      setIsComplete(true);
    }
  };

  const handleSubmitResponse = async () => {
    const currentQuestion = trainingScenarios[currentScenario];
    
    // Validate based on question type
    if (currentQuestion.type === "text" && !currentResponse.trim()) {
      toast({
        title: "Empty Response",
        description: "Please provide a response to continue.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestion.type === "booking_link" && !bookingLinkChoice) {
      toast({
        title: "Selection Required",
        description: "Please select yes or no.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestion.type === "booking_link" && bookingLinkChoice === "yes" && !bookingLinkUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter your booking link URL.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestion.type === "preferred_email" && !emailChoice) {
      toast({
        title: "Selection Required",
        description: "Please select yes or no.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestion.type === "preferred_email" && emailChoice === "yes" && !preferredEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your preferred email address.",
        variant: "destructive",
      });
      return;
    }

    // Store the response
    const newResponses = { ...responses };
    if (currentQuestion.type === "text") {
      newResponses[`q${currentQuestion.id}`] = currentResponse;
    } else if (currentQuestion.type === "booking_link") {
      newResponses[`q${currentQuestion.id}`] = bookingLinkChoice === "yes" ? bookingLinkUrl : "no";
    } else if (currentQuestion.type === "preferred_email") {
      newResponses[`q${currentQuestion.id}`] = emailChoice === "yes" ? preferredEmail : "no";
    }
    setResponses(newResponses);

    // Reset current inputs
    setCurrentResponse("");
    setBookingLinkChoice("");
    setBookingLinkUrl("");
    setEmailChoice("");
    setPreferredEmail("");

    if (currentScenario < trainingScenarios.length - 1) {
      setCurrentScenario(currentScenario + 1);
      toast({
        title: "Response Recorded",
        description: `${trainingScenarios.length - currentScenario - 1} questions remaining`,
      });
    } else {
      // Training complete - save to database
      setIsTraining(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error } = await supabase.functions.invoke("train-ai-tone", {
          body: {
            responses: newResponses,
          },
        });

        if (error) throw error;

        setIsComplete(true);
        onComplete();
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

      {/* Current Question */}
      <div className="space-y-4">
        <div className="bg-background-elevated rounded-lg p-4 border border-card-border">
          <p className="text-sm text-text-heading font-medium mb-2">Question {currentScenario + 1}:</p>
          <p className="text-sm text-text-body">
            {trainingScenarios[currentScenario].question}
          </p>
        </div>

        {trainingScenarios[currentScenario].type === "text" && (
          <div>
            <Label className="text-sm font-medium text-text-heading mb-2 block">
              Your Response:
            </Label>
            <Textarea
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              placeholder={trainingScenarios[currentScenario].placeholder}
              className="min-h-[120px] resize-none"
            />
          </div>
        )}

        {trainingScenarios[currentScenario].type === "booking_link" && (
          <div className="space-y-4">
            <RadioGroup value={bookingLinkChoice} onValueChange={setBookingLinkChoice}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="booking-yes" />
                <Label htmlFor="booking-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="booking-no" />
                <Label htmlFor="booking-no">No</Label>
              </div>
            </RadioGroup>
            {bookingLinkChoice === "yes" && (
              <div>
                <Label className="text-sm font-medium text-text-heading mb-2 block">
                  Enter your booking link URL:
                </Label>
                <Input
                  value={bookingLinkUrl}
                  onChange={(e) => setBookingLinkUrl(e.target.value)}
                  placeholder="https://calendly.com/your-link"
                  type="url"
                />
              </div>
            )}
          </div>
        )}

        {trainingScenarios[currentScenario].type === "preferred_email" && (
          <div className="space-y-4">
            <RadioGroup value={emailChoice} onValueChange={setEmailChoice}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="email-yes" />
                <Label htmlFor="email-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="email-no" />
                <Label htmlFor="email-no">No</Label>
              </div>
            </RadioGroup>
            {emailChoice === "yes" && (
              <div>
                <Label className="text-sm font-medium text-text-heading mb-2 block">
                  Enter your preferred email address:
                </Label>
                <Input
                  value={preferredEmail}
                  onChange={(e) => setPreferredEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  type="email"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between gap-3">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Training
          </Button>
          <Button onClick={handleSubmitResponse} disabled={isTraining}>
            {isTraining ? (
              "Training AI..."
            ) : currentScenario < trainingScenarios.length - 1 ? (
              "Next Question"
            ) : (
              "Complete Training"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
