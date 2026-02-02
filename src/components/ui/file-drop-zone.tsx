import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  id: string;
  className?: string;
}

export function FileDropZone({ onFileSelect, accept = ".pdf,.doc,.docx", id, className }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type
      const acceptedTypes = accept.split(",").map(t => t.trim().toLowerCase());
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      
      if (acceptedTypes.includes(fileExtension) || acceptedTypes.some(t => file.type.includes(t.replace(".", "")))) {
        onFileSelect(file);
      } else {
        console.warn("File type not accepted:", file.type, fileExtension);
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200",
        isDragging
          ? "border-accent-gold bg-accent-gold/10 scale-[1.02]"
          : "border-border hover:border-accent-gold/50",
        className
      )}
    >
      <Upload className={cn(
        "h-12 w-12 mx-auto mb-4 transition-colors",
        isDragging ? "text-accent-gold" : "text-muted-foreground"
      )} />
      <p className="text-lg font-semibold mb-2">
        {isDragging ? "Drop your file here" : "Drop your document here"}
      </p>
      <p className="text-sm text-muted-foreground">or click to browse</p>
      <p className="text-xs text-muted-foreground mt-2">Supports PDF, DOC, DOCX files</p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleInputChange}
      />
    </div>
  );
}
