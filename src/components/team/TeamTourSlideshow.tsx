import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import tourSlide1 from "@/assets/tour-slide-1.png";
import tourSlide2 from "@/assets/tour-slide-2.png";
import tourSlide3 from "@/assets/tour-slide-3.png";

interface TeamTourSlideshowProps {
  isOpen: boolean;
  onClose: () => void;
}

const slides = [
  {
    title: "Team Performance Analytics",
    description: "Get the competitive edge! See exactly what your team is doing with aggregated data. Quickly identify your top performers and spot who on your team needs extra assistance and coaching.",
    image: tourSlide1,
  },
  {
    title: "Progress at a Glance",
    description: "Never lose sight of the big picture. Easily track your day, month, and year-to-date progress to measure momentum and goal achievement.",
    image: tourSlide2,
  },
  {
    title: "Pipeline Clarity",
    description: "Manage your workflow efficiently. See your Prospect, Active, and Lost deals all in one centralized and easy-to-read pipeline view.",
    image: tourSlide3,
  },
];

export default function TeamTourSlideshow({ isOpen, onClose }: TeamTourSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePrevious = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  };

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  const slide = slides[currentSlide];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {slide.title}
          </DialogTitle>
        </DialogHeader>

        {/* Slide Content */}
        <div className="space-y-6">
          {/* Image */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-background">
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Description */}
          <p className="text-lg text-center text-muted-foreground px-8">
            {slide.description}
          </p>

          {/* Progress Indicator */}
          <div className="flex justify-center gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {currentSlide + 1} of {slides.length}
          </span>

          {currentSlide < slides.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleClose} className="gap-2">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
