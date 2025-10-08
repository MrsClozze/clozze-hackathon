import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import slide1 from "@/assets/comm-tour-slide-1.png";
import slide2 from "@/assets/comm-tour-slide-2.png";
import slide3 from "@/assets/comm-tour-slide-3.png";

interface CommunicationHubTourSlideshowProps {
  isOpen: boolean;
  onClose: () => void;
}

const slides = [
  {
    title: "Train Your AI Assistant",
    description: "Worried that your AI assistant won't sound like you? Our AI training tool will ask you questions for you to respond to in your normal tone. Our AI will use this as reference for every message it crafts your replies for!",
    image: slide1,
  },
  {
    title: "Your Centralized Inbox",
    description: "The Communication Hub is where all your incoming messages and emails will live! Don't worry! Only your uploaded contacts or contacts associated with your listings and buyers will aggregate here, keeping your inbox focused.",
    image: slide2,
  },
  {
    title: "Act & Respond Smartly",
    description: "Here you will see ALL your messages, loan approvals, client messages, and even communications from your preferred marketing and photographers. You'll be able to take action by either responding to your messages OR allowing our AI to craft intelligent responses for you.",
    image: slide3,
  },
];

export default function CommunicationHubTourSlideshow({ 
  isOpen, 
  onClose 
}: CommunicationHubTourSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePrevious = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      handleClose();
    } else {
      setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
    }
  };

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0">
        <div className="relative">
          {/* Slide Content */}
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-text-heading">
                {slides[currentSlide].title}
              </h2>
              <p className="text-sm text-muted-foreground">
                Step {currentSlide + 1} of {slides.length}
              </p>
            </div>

            {/* Image */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Description */}
            <p className="text-center text-muted-foreground leading-relaxed">
              {slides[currentSlide].description}
            </p>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentSlide === 0}
                className="min-w-[100px]"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {/* Progress Indicator */}
              <div className="flex gap-2">
                {slides.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? "w-8 bg-primary"
                        : "w-2 bg-muted"
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                className="min-w-[100px]"
              >
                {currentSlide === slides.length - 1 ? "Done" : "Next"}
                {currentSlide < slides.length - 1 && (
                  <ChevronRight className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
