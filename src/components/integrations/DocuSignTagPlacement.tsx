import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PenTool,
  Type,
  Calendar,
  User,
  Mail,
  ChevronLeft,
  ChevronRight,
  Trash2,
  GripVertical,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PlacedTag {
  id: string;
  type: "signHere" | "initialHere" | "dateSigned" | "fullName" | "email";
  recipientIndex: number;
  documentIndex: number;
  pageNumber: number;
  xPercent: number;
  yPercent: number;
}

interface UploadedFile {
  file: File;
  base64: string;
}

interface Recipient {
  name: string;
  email: string;
}

interface DocuSignTagPlacementProps {
  files: UploadedFile[];
  recipients: Recipient[];
  onConfirm: (tags: PlacedTag[]) => void;
  onBack: () => void;
}

const TAG_TYPES = [
  { type: "signHere" as const, label: "Signature", icon: PenTool, borderColor: "border-yellow-500", bgColor: "bg-yellow-500/20", textColor: "text-yellow-700", dotColor: "bg-yellow-500" },
  { type: "initialHere" as const, label: "Initials", icon: Type, borderColor: "border-blue-500", bgColor: "bg-blue-500/20", textColor: "text-blue-700", dotColor: "bg-blue-500" },
  { type: "dateSigned" as const, label: "Date Signed", icon: Calendar, borderColor: "border-green-500", bgColor: "bg-green-500/20", textColor: "text-green-700", dotColor: "bg-green-500" },
  { type: "fullName" as const, label: "Full Name", icon: User, borderColor: "border-purple-500", bgColor: "bg-purple-500/20", textColor: "text-purple-700", dotColor: "bg-purple-500" },
  { type: "email" as const, label: "Email", icon: Mail, borderColor: "border-orange-500", bgColor: "bg-orange-500/20", textColor: "text-orange-700", dotColor: "bg-orange-500" },
];

const RECIPIENT_COLORS = [
  "border-yellow-500 bg-yellow-500/10",
  "border-blue-500 bg-blue-500/10",
  "border-green-500 bg-green-500/10",
  "border-purple-500 bg-purple-500/10",
  "border-orange-500 bg-orange-500/10",
];

export function DocuSignTagPlacement({
  files,
  recipients,
  onConfirm,
  onBack,
}: DocuSignTagPlacementProps) {
  const [tags, setTags] = useState<PlacedTag[]>([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [selectedTagType, setSelectedTagType] = useState<PlacedTag["type"]>("signHere");
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Render PDF page as image
  const renderPage = useCallback(async (fileData: UploadedFile, pageNum: number) => {
    setLoading(true);
    try {
      const binaryStr = atob(fileData.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      setTotalPages(pdf.numPages);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      setPageImage(canvas.toDataURL());
      setPageDimensions({ width: viewport.width, height: viewport.height });
    } catch (err) {
      console.error("Error rendering PDF page:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (files[currentDocIndex]) {
      renderPage(files[currentDocIndex], currentPage);
    }
  }, [currentDocIndex, currentPage, files, renderPage]);

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingTagId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newTag: PlacedTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: selectedTagType,
      recipientIndex: selectedRecipientIndex,
      documentIndex: currentDocIndex,
      pageNumber: currentPage,
      xPercent: Math.max(0, Math.min(x, 90)),
      yPercent: Math.max(0, Math.min(y, 95)),
    };
    setTags((prev) => [...prev, newTag]);
  };

  const removeTag = (tagId: string) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const handleTagMouseDown = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const tagEl = e.currentTarget as HTMLElement;
    const rect = tagEl.getBoundingClientRect();
    setDraggingTagId(tagId);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingTagId || !pageContainerRef.current) return;
      const rect = pageContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100;
      const y = ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100;
      setTags((prev) =>
        prev.map((t) =>
          t.id === draggingTagId
            ? { ...t, xPercent: Math.max(0, Math.min(x, 90)), yPercent: Math.max(0, Math.min(y, 95)) }
            : t
        )
      );
    },
    [draggingTagId, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingTagId(null);
  }, []);

  useEffect(() => {
    if (draggingTagId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingTagId, handleMouseMove, handleMouseUp]);

  const currentPageTags = tags.filter(
    (t) => t.documentIndex === currentDocIndex && t.pageNumber === currentPage
  );

  const getTagConfig = (type: PlacedTag["type"]) =>
    TAG_TYPES.find((t) => t.type === type) || TAG_TYPES[0];

  const hasMinimumTags = recipients.every((_, idx) =>
    tags.some((t) => t.recipientIndex === idx && t.type === "signHere")
  );

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Place Signature Tags</Label>
          <p className="text-xs text-muted-foreground">
            Click on the document to place tags
          </p>
        </div>

        {/* Recipient selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Placing for:</Label>
          <Select
            value={String(selectedRecipientIndex)}
            onValueChange={(v) => setSelectedRecipientIndex(Number(v))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recipients.map((r, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length].split(" ")[0].replace("border-", "bg-")
                      }`}
                    />
                    {r.name || `Signer ${idx + 1}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag type selector */}
        <div className="flex flex-wrap gap-1.5">
          {TAG_TYPES.map((tagType) => {
            const Icon = tagType.icon;
            const isSelected = selectedTagType === tagType.type;
            return (
              <button
                key={tagType.type}
                onClick={() => setSelectedTagType(tagType.type)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tagType.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document navigation */}
      {files.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Document:</Label>
          <Select
            value={String(currentDocIndex)}
            onValueChange={(v) => {
              setCurrentDocIndex(Number(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {files.map((f, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  {f.file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* PDF Preview with tag overlay */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/30 relative">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-sm text-muted-foreground">
              Loading document...
            </div>
          </div>
        ) : pageImage ? (
          <div className="overflow-auto h-full">
            <div
              ref={pageContainerRef}
              className="relative inline-block cursor-crosshair mx-auto"
              onClick={handlePageClick}
              style={{ userSelect: "none" }}
            >
              <img
                src={pageImage}
                alt={`Page ${currentPage}`}
                className="max-w-full h-auto pointer-events-none"
                draggable={false}
              />
              {/* Tag overlays */}
              {currentPageTags.map((tag) => {
                const config = getTagConfig(tag.type);
                const Icon = config.icon;
                const recipientColor =
                  RECIPIENT_COLORS[tag.recipientIndex % RECIPIENT_COLORS.length];
                return (
                  <div
                    key={tag.id}
                    className={`absolute flex items-center gap-1 px-1.5 py-0.5 rounded border-2 text-xs font-medium cursor-grab active:cursor-grabbing shadow-md ${recipientColor} ${
                      draggingTagId === tag.id ? "opacity-70 z-50" : "z-10"
                    }`}
                    style={{
                      left: `${tag.xPercent}%`,
                      top: `${tag.yPercent}%`,
                      transform: "translate(0, -50%)",
                    }}
                    onMouseDown={(e) => handleTagMouseDown(e, tag.id)}
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <Icon className="h-3 w-3" />
                    <span className="text-[10px]">{config.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(tag.id);
                      }}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            Unable to preview document
          </div>
        )}
      </div>

      {/* Page navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tag summary */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Tags placed: {tags.length}
        </Label>
        {recipients.map((r, idx) => {
          const recipientTags = tags.filter((t) => t.recipientIndex === idx);
          const hasSignature = recipientTags.some((t) => t.type === "signHere");
          return (
            <div
              key={idx}
              className={`flex items-center justify-between text-xs p-1.5 rounded border ${
                RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length]
              }`}
            >
              <span>
                {r.name || `Signer ${idx + 1}`}: {recipientTags.length} tag(s)
              </span>
              {!hasSignature && (
                <Badge variant="destructive" className="text-[10px] h-4">
                  Needs signature
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => onConfirm(tags)}
          disabled={!hasMinimumTags}
          className="flex-1 bg-primary text-primary-foreground gap-1.5"
        >
          Confirm Tags
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {!hasMinimumTags && (
        <p className="text-xs text-destructive text-center">
          Each signer must have at least one signature tag placed
        </p>
      )}
    </div>
  );
}
