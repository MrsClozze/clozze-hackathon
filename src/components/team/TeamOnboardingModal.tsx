import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Building, User } from "lucide-react";
import { useState, useEffect } from "react";

interface TeamOnboardingModalProps {
  isOpen: boolean;
  onGotIt: () => void;
  onSeeTour?: () => void;
}

const sections = [
  { icon: User, label: "Personal KPIs", color: "text-primary" },
  { icon: Users, label: "Team Overview", color: "text-accent-gold" },
  { icon: Building, label: "Active Listings", color: "text-success" },
  { icon: TrendingUp, label: "Performance", color: "text-warning" },
];

export default function TeamOnboardingModal({ isOpen, onGotIt, onSeeTour }: TeamOnboardingModalProps) {
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentSection((prev) => (prev + 1) % sections.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const CurrentIcon = sections[currentSection].icon;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-3xl font-bold text-center">
            Your Performance Dashboard
          </DialogTitle>
          <DialogDescription className="text-lg text-center text-muted-foreground">
            Here you will see your personal KPIs. If you are connected to a team account, 
            the bottom portion will unlock, and you will also be able to see you and your team's KPIs!
          </DialogDescription>
        </DialogHeader>

        {/* Animated Preview */}
        <div className="my-8 relative h-80 bg-gradient-to-br from-background via-background to-primary/5 rounded-lg border border-primary/20 overflow-hidden">
          {/* Dashboard Preview Grid */}
          <div className="absolute inset-0 p-6 grid grid-cols-2 gap-4">
            {sections.map((section, index) => {
              const Icon = section.icon;
              const isActive = currentSection === index;
              
              return (
                <div
                  key={section.label}
                  className={`
                    relative rounded-lg border transition-all duration-700 ease-in-out
                    ${isActive 
                      ? 'bg-primary/10 border-primary scale-105 shadow-lg z-10' 
                      : 'bg-background/50 border-border scale-95 opacity-60'
                    }
                  `}
                  style={{
                    transform: isActive ? 'scale(1.05)' : 'scale(0.95)',
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <Icon className={`h-12 w-12 mb-3 transition-colors duration-500 ${isActive ? section.color : 'text-muted-foreground'}`} />
                    <p className={`text-sm font-medium text-center transition-colors duration-500 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {section.label}
                    </p>
                  </div>
                  
                  {/* Animated highlight ring */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {sections.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === currentSection 
                    ? 'w-8 bg-primary' 
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row gap-3 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onGotIt}
            className="min-w-[140px] transition-all duration-300 hover:scale-105"
          >
            Got It
          </Button>
          {onSeeTour && (
            <Button
              size="lg"
              onClick={onSeeTour}
              className="min-w-[140px] transition-all duration-300 hover:scale-105"
            >
              See Tour
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
