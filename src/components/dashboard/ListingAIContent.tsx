import { useState } from "react";
import { FileText, Tag, Megaphone, ScrollText, Copy, ChevronDown, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ListingData, ListingInternalNote } from "@/contexts/ListingsContext";

interface ListingAIContentProps {
  listing: ListingData;
  onListingUpdate?: (updatedListing: ListingData) => void;
}

export default function ListingAIContent({ listing, onListingUpdate }: ListingAIContentProps) {
  const { toast } = useToast();
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(listing.description || '');
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const handleSaveDescription = async () => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ description: descriptionDraft } as any)
        .eq('id', listing.id);
      if (error) throw error;
      if (onListingUpdate) {
        onListingUpdate({ ...listing, description: descriptionDraft });
      }
      setEditingDescription(false);
      toast({ title: "Saved", description: "Listing description updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save description.", variant: "destructive" });
    }
  };

  const handleDeleteNote = async (index: number) => {
    try {
      const updatedNotes = [...listing.internalNotes];
      updatedNotes.splice(index, 1);
      const { error } = await supabase
        .from('listings')
        .update({ internal_notes: updatedNotes } as any)
        .eq('id', listing.id);
      if (error) throw error;
      if (onListingUpdate) {
        onListingUpdate({ ...listing, internalNotes: updatedNotes });
      }
      toast({ title: "Deleted", description: "Note removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" });
    }
  };

  const handleDeleteMarketingVariant = async (key: string) => {
    try {
      const updatedCopy = { ...listing.marketingCopy };
      delete updatedCopy[key];
      const { error } = await supabase
        .from('listings')
        .update({ marketing_copy: updatedCopy } as any)
        .eq('id', listing.id);
      if (error) throw error;
      if (onListingUpdate) {
        onListingUpdate({ ...listing, marketingCopy: updatedCopy });
      }
      toast({ title: "Deleted", description: `"${key}" variant removed.` });
    } catch {
      toast({ title: "Error", description: "Failed to delete variant.", variant: "destructive" });
    }
  };

  const hasAnyContent = listing.description || listing.highlights.length > 0 ||
    listing.internalNotes.length > 0 || Object.keys(listing.marketingCopy).length > 0;

  return (
    <div className="space-y-6 py-4">
      {!hasAnyContent && (
        <div className="text-center py-12 space-y-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No AI content yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Use Clozze AI from a task linked to this listing to generate descriptions, highlights, marketing copy, and research notes.
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      {(listing.description || editingDescription) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Listing Description</h4>
              <Badge variant="outline" className="text-[10px]">MLS Ready</Badge>
            </div>
            <div className="flex gap-1">
              {!editingDescription && listing.description && (
                <>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleCopy(listing.description, 'Description')}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setDescriptionDraft(listing.description); setEditingDescription(true); }}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>
          {editingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                className="min-h-[120px] text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingDescription(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveDescription}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50 whitespace-pre-wrap">
              {listing.description}
            </div>
          )}
        </div>
      )}

      {/* Highlights */}
      {listing.highlights.length > 0 && (
        <Collapsible open={highlightsOpen} onOpenChange={setHighlightsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center gap-2 py-1">
              <Tag className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Property Highlights</h4>
              <Badge variant="secondary" className="text-[10px]">{listing.highlights.length}</Badge>
              <div className="flex-1" />
              {highlightsOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2 mt-2">
              {listing.highlights.map((h, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal py-1 px-2.5">
                  {h}
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs mt-2 text-muted-foreground" onClick={() => handleCopy(listing.highlights.join('\n'), 'Highlights')}>
              <Copy className="h-3 w-3 mr-1" /> Copy All
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Marketing Copy Variants */}
      {Object.keys(listing.marketingCopy).length > 0 && (
        <Collapsible open={marketingOpen} onOpenChange={setMarketingOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center gap-2 py-1">
              <Megaphone className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Marketing Copy</h4>
              <Badge variant="secondary" className="text-[10px]">{Object.keys(listing.marketingCopy).length} variant{Object.keys(listing.marketingCopy).length > 1 ? 's' : ''}</Badge>
              <div className="flex-1" />
              {marketingOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            {Object.entries(listing.marketingCopy).map(([key, value]) => (
              <div key={key} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{key}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground" onClick={() => handleCopy(value, key)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleDeleteMarketingVariant(key)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Internal Notes (versioned) */}
      {listing.internalNotes.length > 0 && (
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center gap-2 py-1">
              <ScrollText className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Research & Notes</h4>
              <Badge variant="secondary" className="text-[10px]">{listing.internalNotes.length}</Badge>
              <div className="flex-1" />
              {notesOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            {[...listing.internalNotes].reverse().map((note: ListingInternalNote, i: number) => {
              const realIndex = listing.internalNotes.length - 1 - i;
              return (
                <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{note.label || 'Note'}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {note.source === 'clozze_ai' ? '🤖 AI' : note.source} · {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground" onClick={() => handleCopy(note.content, 'Note')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNote(realIndex)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{note.content}</p>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
