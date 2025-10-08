import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import pendingImage from "@/assets/listings-tour-pending.png";
import activeImage from "@/assets/listings-tour-active.png";
import closedImage from "@/assets/listings-tour-closed.png";

interface ListingsTourSlideshowProps {
  isOpen: boolean;
  onClose: () => void;
}

const slides = [
  {
    title: "Pending Listings: Getting Started",
    description: "When you manually upload a listing or connect to one of our integrated partners, it enters a Pending state. While pending, you can easily assign contacts and add tasks to keep the process moving.",
    image: pendingImage,
  },
  {
    title: "Active Listings: In Motion",
    description: "Upon a signed contract being completed (either marked in your tasks or uploaded to the system), your listing will automatically transition into the Active state, signaling that work is underway.",
    image: activeImage,
  },
  {
    title: "Closed Listings: Archiving Success",
    description: "When a sale or listing is completed, your progress is automatically archived in the Closed section. You can always reactivate a closed listing by manually marking it as Pending or Active again.",
    image: closedImage,
  },
];

export default function ListingsTourSlideshow({ isOpen, onClose }: ListingsTourSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePrevious = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{slides[currentSlide].title}</h2>
            <p className="text-muted-foreground text-lg">
              {slides[currentSlide].description}
            </p>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={slides[currentSlide].image}
              alt={slides[currentSlide].title}
              className="w-full h-auto"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              {currentSlide + 1} of {slides.length}
            </div>

            <Button
              onClick={handleNext}
              className="gap-2"
            >
              {currentSlide === slides.length - 1 ? "Done" : "Next"}
              {currentSlide < slides.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
