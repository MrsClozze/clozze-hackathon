import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FileText, Tag, Megaphone, ScrollText, Copy, ChevronDown, ChevronRight, Sparkles, Trash2, RefreshCw, Wand2, Loader2, ClipboardList, CheckCircle2, Circle, ListChecks, ArrowRight, AlertTriangle, ListTodo, Layers, Clock, Bot, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeClozzeAICreate } from "@/lib/invokeClozzeAICreate";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ListingData, ListingInternalNote } from "@/contexts/ListingsContext";
import { computeListingCompletion, getListingTaskBundle, getListingGroupedActions, type CompletionItem } from "@/lib/completionTracking";
import { getWorkflowState, recordAction, setLastNextStep, setGroupedFlowInProgress, getResumeSummary } from "@/lib/workflowState";
import { normalizeMarkdownSpacing } from "@/lib/taskTypeConfigs";

interface ListingAIContentProps {
  listing: ListingData;
  onListingUpdate?: (updatedListing: ListingData) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** What type of content this message contains — used for Apply buttons */
  contentType?: 'description' | 'highlights' | 'marketing' | 'audit' | 'general';
}

/** Strip AI JSON code blocks and markdown headers from generated content */
const stripAIBlocks = (text: string): string => {
  return text
    .replace(/```json-listing[\s\S]*?```/g, '')
    .replace(/```json-buyer[\s\S]*?```/g, '')
    .replace(/```json-tasks[\s\S]*?```/g, '')
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/^#+\s.*\n?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export default function ListingAIContent({ listing, onListingUpdate }: ListingAIContentProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(listing.description || '');
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Workflow state from localStorage
  const workflowState = useMemo(() => getWorkflowState('listing', listing.id), [listing.id]);
  const resumeSummary = useMemo(() => getResumeSummary('listing', listing.id), [listing.id]);

  const completion = useMemo(
    () => computeListingCompletion(listing, workflowState.lastCompletedActionKey),
    [listing, workflowState.lastCompletedActionKey]
  );
  const groupedActions = useMemo(() => getListingGroupedActions(completion), [completion]);

  useEffect(() => {
    const nextKey = completion.nextStep?.key ?? null;
    setLastNextStep('listing', listing.id, nextKey);
  }, [completion.nextStep, listing.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const flashComplete = (key: string) => {
    setJustCompleted(key);
    setTimeout(() => setJustCompleted(null), 2000);
  };

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
      flashComplete('description');
      recordAction('listing', listing.id, 'save_description', 'Saved listing description');
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

  /** Build a full context snapshot of the listing record for the AI */
  const buildListingContext = useCallback(() => {
    const fullAddress = `${listing.address}, ${listing.city}${listing.zipcode ? ' ' + listing.zipcode : ''}${listing.county ? ', ' + listing.county : ''}`;
    return `You are an AI transaction coordinator for a real estate listing. You already have full access to this listing record — NEVER ask for information that is provided below. Use this context to answer questions, generate content, and identify gaps.

=== LISTING RECORD (Current State) ===
Address: ${fullAddress}
Price: ${listing.price ? '$' + listing.price.toLocaleString() : 'NOT SET'}
Status: ${listing.status}
Bedrooms: ${listing.bedrooms ?? 'NOT SET'}
Bathrooms: ${listing.bathrooms ?? 'NOT SET'}
Square Feet: ${listing.sqFeet ?? 'NOT SET'}
Days on Market: ${listing.daysOnMarket ?? 'N/A'}
Commission: ${listing.commissionPercentage ? listing.commissionPercentage + '%' : 'NOT SET'}
Listing Start: ${listing.listingStartDate || 'NOT SET'}
Listing End: ${listing.listingEndDate || 'NOT SET'}

=== SELLER INFO ===
Name: ${listing.sellerFirstName || listing.sellerLastName ? `${listing.sellerFirstName || ''} ${listing.sellerLastName || ''}`.trim() : 'NOT SET'}
Email: ${listing.sellerEmail || 'NOT SET'}
Phone: ${listing.sellerPhone || 'NOT SET'}

=== CONTENT STATUS ===
Description: ${listing.description ? 'EXISTS (' + listing.description.length + ' chars): "' + listing.description.substring(0, 200) + '..."' : 'MISSING — needs generation'}
Highlights: ${listing.highlights.length > 0 ? listing.highlights.length + ' items: ' + listing.highlights.join('; ') : 'MISSING — needs generation'}
Marketing Copy: ${Object.keys(listing.marketingCopy).length > 0 ? Object.keys(listing.marketingCopy).map(k => `${k}: "${String(listing.marketingCopy[k]).substring(0, 100)}..."`).join('; ') : 'MISSING'}
Internal Notes: ${listing.internalNotes.length > 0 ? listing.internalNotes.length + ' notes' : 'None'}

=== INSTRUCTIONS ===
- NEVER ask for the address, price, beds, baths, sqft, seller info, or any field shown above that has a value.
- If a field above says "NOT SET", you may ask for it OR offer to research/infer it.
- Use Firecrawl research to enrich missing public property data (neighborhood, schools, nearby amenities, property history).
- When generating descriptions or highlights, USE the data above — do not ask the user to provide what you already have.
- Proactively identify gaps and offer to fill them. Act like a transaction coordinator who already knows the file.
- Format responses cleanly with markdown. Be direct and actionable.`;
  }, [listing]);

  /** Send a message to the AI chat — content appears in the chat, NOT in the fields */
  const sendChatMessage = useCallback(async (message: string, contentType?: ChatMessage['contentType']) => {
    if (!message.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    setChatMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), contentType }]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Build conversation history with full record context as first message
      const contextMessage = { role: 'user' as const, content: buildListingContext() };
      const contextAck = { role: 'assistant' as const, content: 'Understood. I have full access to this listing record and will use all available data without asking for information I already have.' };
      const history = [
        contextMessage,
        contextAck,
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const { content } = await invokeClozzeAICreate({
        flow: 'listing',
        message: message.trim(),
        conversationHistory: history,
        existingFormData: {
          address: listing.address,
          city: listing.city,
          zipcode: listing.zipcode,
          county: listing.county,
          price: listing.price,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          sqFeet: listing.sqFeet,
          status: listing.status,
          sellerFirstName: listing.sellerFirstName,
          sellerLastName: listing.sellerLastName,
          sellerEmail: listing.sellerEmail,
          sellerPhone: listing.sellerPhone,
          description: listing.description,
          highlights: listing.highlights,
        },
      });

      const cleaned = stripAIBlocks(content);
      setChatMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: cleaned, contentType: contentType || detectContentType(cleaned) } : m)
      );
    } catch (err: any) {
      console.error('AI chat error:', err);
      setChatMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: 'Sorry, I encountered an error. Please try again.' } : m)
      );
      toast({ title: "Error", description: "Failed to get AI response.", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, toast, buildListingContext, chatMessages, listing]);

  /** Detect what type of content the AI generated */
  const detectContentType = (content: string): ChatMessage['contentType'] => {
    const lower = content.toLowerCase();
    if (lower.includes('✅ complete') || lower.includes('⚠️ missing') || lower.includes('readiness audit')) return 'audit';
    if (lower.includes('highlight') && (content.match(/^[-•]/gm)?.length ?? 0) >= 4) return 'highlights';
    if (lower.includes('marketing') || lower.includes('social media') || lower.includes('instagram')) return 'marketing';
    if (content.length > 200 && !content.includes('##')) return 'description';
    return 'general';
  };

  /** Apply AI-generated content to the actual listing field */
  const handleApplyContent = async (content: string, target: 'description' | 'highlights' | 'marketing') => {
    try {
      if (target === 'description') {
        await supabase.from('listings').update({ description: content } as any).eq('id', listing.id);
        onListingUpdate?.({ ...listing, description: content });
        setDescriptionDraft(content);
        flashComplete('description');
        recordAction('listing', listing.id, 'apply_description', 'Applied AI description');
        toast({ title: "✓ Description applied", description: "AI-generated description saved to listing." });
      } else if (target === 'highlights') {
        const highlights = content.split('\n').map(l => l.trim().replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')).filter(l => l.length > 2 && l.length < 300);
        await supabase.from('listings').update({ highlights } as any).eq('id', listing.id);
        onListingUpdate?.({ ...listing, highlights });
        flashComplete('highlights');
        recordAction('listing', listing.id, 'apply_highlights', 'Applied AI highlights');
        toast({ title: "✓ Highlights applied", description: `${highlights.length} highlights saved to listing.` });
      } else if (target === 'marketing') {
        const key = 'social';
        const updatedCopy = { ...listing.marketingCopy, [key]: content.trim() };
        await supabase.from('listings').update({ marketing_copy: updatedCopy } as any).eq('id', listing.id);
        onListingUpdate?.({ ...listing, marketingCopy: updatedCopy });
        flashComplete('marketing');
        recordAction('listing', listing.id, 'apply_marketing', 'Applied AI marketing copy');
        toast({ title: "✓ Marketing copy applied", description: "Marketing copy saved to listing." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to apply content.", variant: "destructive" });
    }
  };

  /** Quick-action buttons that send pre-built prompts to the chat */
  const handleQuickAction = (type: 'description' | 'highlights' | 'marketing' | 'audit') => {
    const fullAddress = `${listing.address}, ${listing.city}${listing.zipcode ? ' ' + listing.zipcode : ''}`;
    const prompts: Record<string, string> = {
      description: `Research and write a compelling MLS-ready listing description for this property at ${fullAddress}. ${listing.bedrooms}bd/${listing.bathrooms}ba, ${listing.sqFeet} sqft, listed at $${listing.price?.toLocaleString()}. ${listing.highlights.length > 0 ? 'Key features: ' + listing.highlights.join(', ') : ''} Write only the description text.`,
      highlights: `Research and generate 6-8 property highlights/key selling points for: ${fullAddress}. ${listing.bedrooms}bd/${listing.bathrooms}ba, ${listing.sqFeet} sqft, $${listing.price?.toLocaleString()}. ${listing.description ? 'Description: ' + listing.description.substring(0, 300) : ''} Return only a bullet list of features, one per line, starting with a dash.`,
      marketing: `Write a social media marketing copy for: ${fullAddress}. ${listing.bedrooms}bd/${listing.bathrooms}ba, ${listing.sqFeet} sqft, $${listing.price?.toLocaleString()}. ${listing.description ? 'MLS Description: ' + listing.description.substring(0, 300) : ''} Write only the copy text, optimized for social media.`,
      audit: `Run a listing readiness audit for this property. Research the property and evaluate what is complete, what is missing, and recommend next steps.

Property: ${fullAddress}${listing.county ? ', ' + listing.county : ''}
Price: $${listing.price?.toLocaleString() || 'Not set'}
Beds: ${listing.bedrooms ?? 'N/A'} | Baths: ${listing.bathrooms ?? 'N/A'} | Sq Ft: ${listing.sqFeet ?? 'N/A'}
Status: ${listing.status}
Seller: ${listing.sellerFirstName || ''} ${listing.sellerLastName || ''} | Email: ${listing.sellerEmail || 'N/A'} | Phone: ${listing.sellerPhone || 'N/A'}
Description: ${listing.description ? 'Yes (' + listing.description.length + ' chars)' : 'MISSING'}
Highlights: ${listing.highlights.length > 0 ? listing.highlights.length + ' items' : 'MISSING'}
Marketing Copy: ${Object.keys(listing.marketingCopy).length > 0 ? Object.keys(listing.marketingCopy).join(', ') : 'MISSING'}`,
    };
    sendChatMessage(prompts[type], type === 'audit' ? 'audit' : type);
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
      recordAction('listing', listing.id, 'create_tasks', `Created ${tasks.length} tasks`);
      toast({ title: "✓ Tasks created", description: `${tasks.length} tasks created based on current listing state.` });
    } catch (err) {
      console.error('Task creation error:', err);
      toast({ title: "Error", description: "Failed to create tasks.", variant: "destructive" });
    } finally {
      setCreatingTasks(false);
    }
  };

  const handleChecklistAction = (item: CompletionItem) => {
    if (item.actionType === 'generate_description') handleQuickAction('description');
    else if (item.actionType === 'generate_highlights') handleQuickAction('highlights');
    else if (item.actionType === 'generate_marketing') handleQuickAction('marketing');
  };

  const completeItems = completion.items.filter(i => i.complete);

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage(chatInput);
    }
  };

  return (
    <div className="space-y-5 py-4">
      {/* Resume Banner */}
      {resumeSummary.hasHistory && resumeSummary.lastAction && (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Last action: <span className="font-medium text-foreground">{resumeSummary.lastAction.label}</span>
            {resumeSummary.lastInteraction && (
              <> · {new Date(resumeSummary.lastInteraction).toLocaleDateString()}</>
            )}
          </p>
        </div>
      )}

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

      {/* AI Chat Section */}
      <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
            <Bot className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Clozze AI Assistant</h4>
            <Badge variant="outline" className="text-[9px] h-4 ml-auto mr-1">chat</Badge>
            {chatOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-border bg-background">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-1.5 p-3 border-b border-border/50">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('audit')} disabled={chatLoading}>
                <Wand2 className="h-3 w-3" /> Run Audit
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('description')} disabled={chatLoading}>
                <FileText className="h-3 w-3" /> Generate Description
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('highlights')} disabled={chatLoading}>
                <Tag className="h-3 w-3" /> Generate Highlights
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('marketing')} disabled={chatLoading}>
                <Megaphone className="h-3 w-3" /> Generate Marketing
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleCreateContextTasks} disabled={creatingTasks}>
                {creatingTasks ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListChecks className="h-3 w-3" />}
                Create Tasks ({getListingTaskBundle(completion, listing).length})
              </Button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="max-h-[400px]" ref={chatScrollRef as any}>
              <div className="p-3 space-y-3">
                {chatMessages.length === 0 && !chatLoading && (
                  <div className="text-center py-6">
                    <Bot className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Ask anything about this listing, or use the buttons above to generate content.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated content will appear here — you decide when to apply it.
                    </p>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[90%] rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 border border-border'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="space-y-2">
                          <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_br]:hidden">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {normalizeMarkdownSpacing(msg.content || '...')}
                            </ReactMarkdown>
                          </div>
                          {/* Apply buttons — only show when message is complete and has applicable content */}
                          {msg.content && !chatLoading && msg.contentType && msg.contentType !== 'audit' && msg.contentType !== 'general' && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                              {msg.contentType === 'description' && (
                                <Button variant="outline" size="sm" className="h-6 px-2.5 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10" onClick={() => handleApplyContent(msg.content, 'description')}>
                                  <FileText className="h-3 w-3" /> Apply to Description
                                </Button>
                              )}
                              {msg.contentType === 'highlights' && (
                                <Button variant="outline" size="sm" className="h-6 px-2.5 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10" onClick={() => handleApplyContent(msg.content, 'highlights')}>
                                  <Tag className="h-3 w-3" /> Apply to Highlights
                                </Button>
                              )}
                              {msg.contentType === 'marketing' && (
                                <Button variant="outline" size="sm" className="h-6 px-2.5 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10" onClick={() => handleApplyContent(msg.content, 'marketing')}>
                                  <Megaphone className="h-3 w-3" /> Apply to Marketing
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => handleCopy(msg.content, 'Content')}>
                                <Copy className="h-3 w-3 mr-1" /> Copy
                              </Button>
                            </div>
                          )}
                          {msg.content && !chatLoading && (msg.contentType === 'audit' || msg.contentType === 'general') && (
                            <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => handleCopy(msg.content, 'Content')}>
                                <Copy className="h-3 w-3 mr-1" /> Copy
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-1">
                        <User className="h-3.5 w-3.5 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-8">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Generating…</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-3 border-t border-border/50">
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask about this listing or request content…"
                  className="min-h-[36px] max-h-[100px] text-sm resize-none py-2"
                  rows={1}
                />
                <Button size="sm" className="h-9 w-9 p-0 shrink-0" onClick={() => sendChatMessage(chatInput)} disabled={!chatInput.trim() || chatLoading}>
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
          <p className="text-sm font-medium text-foreground">{completion.nextStep.label}</p>
          {completion.nextStep.resolution && (
            <p className="text-xs text-muted-foreground">{completion.nextStep.resolution}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {completion.nextStep.actionType && completion.nextStep.actionLabel && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleChecklistAction(completion.nextStep!)} disabled={chatLoading}>
                {chatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {completion.nextStep.actionLabel}
              </Button>
            )}
            {!completion.nextStep.actionType && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleCreateContextTasks} disabled={creatingTasks}>
                {creatingTasks ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListTodo className="h-3 w-3" />}
                Create Task to Resolve
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
              <div key={item.key} className={`flex items-center justify-between py-1.5 px-2.5 rounded-md border transition-colors ${justCompleted === item.key ? 'bg-primary/10 border-primary/30' : 'bg-destructive/5 border-destructive/20'}`}>
                <div className="flex items-center gap-2">
                  {justCompleted === item.key
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-primary animate-in fade-in" />
                    : <Circle className="h-3.5 w-3.5 text-destructive/50" />
                  }
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                {item.actionType && item.actionLabel && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary" onClick={() => handleChecklistAction(item)} disabled={chatLoading}>
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
              <div key={item.key} className={`flex items-center justify-between py-1.5 px-2.5 rounded-md border transition-colors ${justCompleted === item.key ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border/50'}`}>
                <div className="flex items-center gap-2">
                  {justCompleted === item.key
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-primary animate-in fade-in" />
                    : <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                  }
                  <span className="text-sm text-foreground">{item.label}</span>
                  <Badge variant="outline" className="text-[9px] h-4">{item.category}</Badge>
                </div>
                {item.actionType && item.actionLabel && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary" onClick={() => handleChecklistAction(item)} disabled={chatLoading}>
                    {item.actionLabel}
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

      {/* Description Display (read-only / edit) */}
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
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickAction('description')} disabled={chatLoading}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
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
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50 whitespace-pre-wrap">{stripAIBlocks(listing.description)}</div>
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
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => handleQuickAction('highlights')} disabled={chatLoading}>
                <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
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
