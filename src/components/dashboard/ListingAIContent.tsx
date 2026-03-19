import { useState, useMemo } from "react";
import { FileText, Tag, Megaphone, ScrollText, Copy, ChevronDown, ChevronRight, Sparkles, Trash2, RefreshCw, Wand2, Loader2, ClipboardList, CheckCircle2, Circle, ListChecks, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ListingData, ListingInternalNote } from "@/contexts/ListingsContext";
import { computeListingCompletion, getListingTaskBundle, type CompletionItem } from "@/lib/completionTracking";

interface ListingAIContentProps {
  listing: ListingData;
  onListingUpdate?: (updatedListing: ListingData) => void;
}

export default function ListingAIContent({ listing, onListingUpdate }: ListingAIContentProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(listing.description || '');
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [creatingTasks, setCreatingTasks] = useState(false);

  const completion = useMemo(() => computeListingCompletion(listing), [listing]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const handleSaveDescription = async () => {
    try {
      const { error } = await supabase.from('listings').update({ description: descriptionDraft } as any).eq('id', listing.id);
      if (error) throw error;
      onListingUpdate?.({ ...listing, description: descriptionDraft });
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
      const { error } = await supabase.from('listings').update({ internal_notes: updatedNotes } as any).eq('id', listing.id);
      if (error) throw error;
      onListingUpdate?.({ ...listing, internalNotes: updatedNotes });
      toast({ title: "Deleted", description: "Note removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" });
    }
  };

  const handleDeleteMarketingVariant = async (key: string) => {
    try {
      const updatedCopy = { ...listing.marketingCopy };
      delete updatedCopy[key];
      const { error } = await supabase.from('listings').update({ marketing_copy: updatedCopy } as any).eq('id', listing.id);
      if (error) throw error;
      onListingUpdate?.({ ...listing, marketingCopy: updatedCopy });
      toast({ title: "Deleted", description: `"${key}" variant removed.` });
    } catch {
      toast({ title: "Error", description: "Failed to delete variant.", variant: "destructive" });
    }
  };

  const handleRegenerate = async (type: 'description' | 'highlights' | 'marketing', variant?: string) => {
    setRegenerating(type);
    try {
      const prompts: Record<string, string> = {
        description: `Write a compelling MLS-ready listing description for this property: ${listing.address}, ${listing.city}. ${listing.bedrooms}bd/${listing.bathrooms}ba, ${listing.sqFeet} sqft, listed at $${listing.price?.toLocaleString()}. ${listing.highlights.length > 0 ? 'Key features: ' + listing.highlights.join(', ') : ''} Write only the description text, no headers or labels.`,
        highlights: `Generate 6-8 property highlights/key selling points for: ${listing.address}, ${listing.city}. ${listing.bedrooms}bd/${listing.bathrooms}ba, ${listing.sqFeet} sqft, $${listing.price?.toLocaleString()}. ${listing.description ? 'Description: ' + listing.description.substring(0, 300) : ''} Return only a bullet list of features, one per line, starting with a dash.`,
        marketing: `Write a ${variant || 'social media'} marketing copy for: ${listing.address}, ${listing.city}. ${listing.bedrooms}bd/${listing.bathrooms}ba, ${listing.sqFeet} sqft, $${listing.price?.toLocaleString()}. ${listing.description ? 'MLS Description: ' + listing.description.substring(0, 300) : ''} Write only the copy text, optimized for ${variant || 'social media'}.`,
      };

      const { data, error } = await supabase.functions.invoke('clozze-ai-create', {
        body: { flow: 'listing', message: prompts[type], context: { address: listing.address, city: listing.city, price: listing.price, bedrooms: listing.bedrooms, bathrooms: listing.bathrooms, sqFeet: listing.sqFeet } },
      });
      if (error) throw error;
      const generated = data?.response || data?.content || '';
      if (!generated) throw new Error('No content generated');

      if (type === 'description') {
        const cleaned = generated.replace(/^#+\s.*\n?/gm, '').trim();
        await supabase.from('listings').update({ description: cleaned } as any).eq('id', listing.id);
        onListingUpdate?.({ ...listing, description: cleaned });
        setDescriptionDraft(cleaned);
        toast({ title: "Generated", description: "New listing description saved." });
      } else if (type === 'highlights') {
        const highlights = generated.split('\n').map((l: string) => l.trim().replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')).filter((l: string) => l.length > 2 && l.length < 300);
        await supabase.from('listings').update({ highlights } as any).eq('id', listing.id);
        onListingUpdate?.({ ...listing, highlights });
        toast({ title: "Generated", description: `${highlights.length} highlights saved.` });
      } else if (type === 'marketing') {
        const key = variant || 'social';
        const updatedCopy = { ...listing.marketingCopy, [key]: generated.trim() };
        await supabase.from('listings').update({ marketing_copy: updatedCopy } as any).eq('id', listing.id);
        onListingUpdate?.({ ...listing, marketingCopy: updatedCopy });
        toast({ title: "Generated", description: `${key} marketing copy saved.` });
      }
    } catch (err: any) {
      console.error('Regenerate error:', err);
      toast({ title: "Error", description: "Failed to generate content.", variant: "destructive" });
    } finally {
      setRegenerating(null);
    }
  };

  const handlePrepareAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    try {
      const auditPrompt = `Run a listing readiness audit for this property. Evaluate what is complete, what is missing, and recommend next steps.

Property: ${listing.address}, ${listing.city}${listing.zipcode ? ' ' + listing.zipcode : ''}${listing.county ? ', ' + listing.county : ''}
Price: $${listing.price?.toLocaleString() || 'Not set'}
Beds: ${listing.bedrooms ?? 'N/A'} | Baths: ${listing.bathrooms ?? 'N/A'} | Sq Ft: ${listing.sqFeet ?? 'N/A'}
Status: ${listing.status}
Seller: ${listing.sellerFirstName || ''} ${listing.sellerLastName || ''} | Email: ${listing.sellerEmail || 'N/A'} | Phone: ${listing.sellerPhone || 'N/A'}
Description: ${listing.description ? 'Yes (' + listing.description.length + ' chars)' : 'MISSING'}
Highlights: ${listing.highlights.length > 0 ? listing.highlights.length + ' items' : 'MISSING'}
Marketing Copy: ${Object.keys(listing.marketingCopy).length > 0 ? Object.keys(listing.marketingCopy).join(', ') : 'MISSING'}
Commission: ${listing.commissionPercentage || 'N/A'}%

Use this exact format:
## ✅ Complete Information
- List what data is already available

## ⚠️ Missing Information
- List each missing item as: - [ ] Item description

## 📋 Recommended Actions
- Specific next steps the agent should take

## 📌 Suggested Next Steps
- Prioritized list of what to do next`;

      const { data, error } = await supabase.functions.invoke('clozze-ai-create', {
        body: { flow: 'listing', message: auditPrompt, context: { address: listing.address, city: listing.city, price: listing.price } },
      });
      if (error) throw error;
      setAuditResult(data?.response || data?.content || 'No audit results generated.');
    } catch (err) {
      console.error('Audit error:', err);
      toast({ title: "Error", description: "Failed to run audit.", variant: "destructive" });
    } finally {
      setAuditRunning(false);
    }
  };

  const handleCreateContextTasks = async () => {
    if (!user) return;
    setCreatingTasks(true);
    try {
      const taskBundle = getListingTaskBundle(completion, listing);
      const tasks = taskBundle.map(t => ({
        user_id: user.id,
        title: `${t.title} — ${listing.address}`,
        priority: t.priority,
        status: 'pending',
        listing_id: listing.id,
        address: `${listing.address}, ${listing.city}`,
      }));
      const { error } = await supabase.from('tasks').insert(tasks);
      if (error) throw error;
      toast({ title: "Tasks Created", description: `${tasks.length} tasks created based on current listing state.` });
    } catch (err) {
      console.error('Task creation error:', err);
      toast({ title: "Error", description: "Failed to create tasks.", variant: "destructive" });
    } finally {
      setCreatingTasks(false);
    }
  };

  const handleChecklistAction = (item: CompletionItem) => {
    if (item.actionType === 'generate_description') handleRegenerate('description');
    else if (item.actionType === 'generate_highlights') handleRegenerate('highlights');
    else if (item.actionType === 'generate_marketing') handleRegenerate('marketing', 'social');
  };

  const incompleteItems = completion.items.filter(i => !i.complete);
  const completeItems = completion.items.filter(i => i.complete);

  return (
    <div className="space-y-5 py-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Listing {completion.percentage}% Ready
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {completion.completeCount}/{completion.totalCount} fields
          </span>
        </div>
        <Progress value={completion.percentage} className="h-2" />
      </div>

      {/* Next Step Card */}
      {completion.nextStep && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Next Step</span>
            <Badge variant={completion.nextStep.category === 'required' ? 'destructive' : 'outline'} className="text-[9px] h-4">
              {completion.nextStep.category === 'required' ? 'blocker' : completion.nextStep.category}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{completion.nextStep.label}</p>
            {completion.nextStep.actionType && completion.nextStep.actionLabel && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleChecklistAction(completion.nextStep!)} disabled={!!regenerating}>
                {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : completion.nextStep.actionLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Blockers */}
      {completion.blockers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <h4 className="text-xs font-semibold text-destructive uppercase tracking-wide">
              Blockers ({completion.blockers.length})
            </h4>
          </div>
          <div className="space-y-1.5">
            {completion.blockers.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <Circle className="h-3.5 w-3.5 text-destructive/50" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                {item.actionType && item.actionLabel && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary" onClick={() => handleChecklistAction(item)} disabled={!!regenerating}>
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {completion.improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Improvements ({completion.improvements.length})
          </h4>
          <div className="space-y-1.5">
            {completion.improvements.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-sm text-foreground">{item.label}</span>
                  <Badge variant="outline" className="text-[9px] h-4">{item.category}</Badge>
                </div>
                {item.actionType && item.actionLabel && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary" onClick={() => handleChecklistAction(item)} disabled={!!regenerating}>
                    {regenerating && (item.actionType === 'generate_description' && regenerating === 'description' || item.actionType === 'generate_highlights' && regenerating === 'highlights' || item.actionType === 'generate_marketing' && regenerating === 'marketing')
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : item.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Items */}
      {completeItems.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>{completeItems.length} completed</span>
              <ChevronRight className="h-3 w-3 ml-auto" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-1">
              {completeItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2 py-1 px-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="line-through">{item.label}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Action Row */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
        <Button size="sm" onClick={handlePrepareAudit} disabled={auditRunning} className="gap-1.5">
          {auditRunning ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Auditing…</> : <><Wand2 className="h-3.5 w-3.5" /> Run Audit</>}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCreateContextTasks} disabled={creatingTasks} className="gap-1.5">
          {creatingTasks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
          Create Tasks ({getListingTaskBundle(completion, listing).length})
        </Button>
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Readiness Audit</h4>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleCopy(auditResult, 'Audit')}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAuditResult(null)}>Dismiss</Button>
            </div>
          </div>
          <div className="text-sm">
            {auditResult.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1">{line.replace('## ', '')}</h3>;
              if (line.startsWith('- [ ] ')) return <p key={i} className="text-sm text-muted-foreground ml-2">☐ {line.replace('- [ ] ', '')}</p>;
              if (line.startsWith('- ')) return <p key={i} className="text-sm text-muted-foreground ml-2">• {line.replace(/^- \[x?\] /, '').replace(/^- /, '')}</p>;
              if (line.trim()) return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
              return null;
            })}
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            {!listing.description && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleRegenerate('description')} disabled={!!regenerating}>
                {regenerating === 'description' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} Generate Description
              </Button>
            )}
            {listing.highlights.length === 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleRegenerate('highlights')} disabled={!!regenerating}>
                {regenerating === 'highlights' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />} Generate Highlights
              </Button>
            )}
            {Object.keys(listing.marketingCopy).length === 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleRegenerate('marketing', 'social')} disabled={!!regenerating}>
                {regenerating === 'marketing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Megaphone className="h-3 w-3" />} Generate Marketing
              </Button>
            )}
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
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setDescriptionDraft(listing.description); setEditingDescription(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleRegenerate('description')} disabled={!!regenerating}>
                    {regenerating === 'description' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Regenerate
                  </Button>
                </>
              )}
            </div>
          </div>
          {editingDescription ? (
            <div className="space-y-2">
              <Textarea value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} className="min-h-[120px] text-sm" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingDescription(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveDescription}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50 whitespace-pre-wrap">{listing.description}</div>
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
                <Badge key={i} variant="outline" className="text-xs font-normal py-1 px-2.5">{h}</Badge>
              ))}
            </div>
            <div className="flex gap-1 mt-2">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => handleCopy(listing.highlights.join('\n'), 'Highlights')}>
                <Copy className="h-3 w-3 mr-1" /> Copy All
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => handleRegenerate('highlights')} disabled={!!regenerating}>
                {regenerating === 'highlights' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Regenerate
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Marketing Copy */}
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
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground" onClick={() => handleRegenerate('marketing', key)} disabled={!!regenerating}>
                      {regenerating === 'marketing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleDeleteMarketingVariant(key)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => handleRegenerate('marketing', `variant_${Object.keys(listing.marketingCopy).length + 1}`)} disabled={!!regenerating}>
              {regenerating === 'marketing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Megaphone className="h-3 w-3" />} Generate New Variant
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Internal Notes */}
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
