import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface PhotoUploadProps {
  currentImage: string;
  alt: string;
  onImageChange: (newImage: string) => void;
  className?: string;
}

export default function PhotoUpload({ currentImage, alt, onImageChange, className = "" }: PhotoUploadProps) {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onImageChange(result);
        toast({
          title: "Photo updated",
          description: "The photo has been successfully updated",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange('');
    toast({
      title: "Photo removed",
      description: "The photo has been removed",
    });
  };

  return (
    <div 
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={currentImage}
        alt={alt}
        className="w-full h-full object-cover"
      />
      
      {/* Overlay with upload/change buttons */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUploadClick}
              className="bg-white/90 text-gray-900 hover:bg-white"
            >
              <Camera className="h-4 w-4 mr-1" />
              Change
            </Button>
            {currentImage && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemovePhoto}
                className="bg-red-500/90 hover:bg-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}