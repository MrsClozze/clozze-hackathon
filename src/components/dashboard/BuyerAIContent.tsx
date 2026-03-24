import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ClipboardList, Loader2, Wand2, Copy, UserCheck, MessageSquare, ListTodo, Sparkles, Circle, CheckCircle2, ChevronRight, ChevronDown, ListChecks, Save, ArrowRight, AlertTriangle, Search, FileCheck, Home, FileText, DollarSign, Layers, Clock, Bot, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeClozzeAICreate } from "@/lib/invokeClozzeAICreate";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BuyerData } from "@/contexts/BuyersContext";
import { computeBuyerCompletion, getBuyerPhase, getBuyerTaskBundle, getBuyerGroupedActions, type CompletionItem, type BuyerPhase } from "@/lib/completionTracking";
import { getWorkflowState, recordAction, setLastNextStep, setGroupedFlowInProgress, getResumeSummary } from "@/lib/workflowState";
import { normalizeMarkdownSpacing } from "@/lib/taskTypeConfigs";

interface BuyerAIContentProps {
  buyer: BuyerData;
  onBuyerUpdate?: (updatedBuyer: BuyerData) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  contentType?: 'audit' | 'structured_needs' | 'draft' | 'general';
}

const PHASE_CONFIG: Record<BuyerPhase, { label: string; description: string; badge: string }> = {
  profiling: { label: 'Profile Incomplete', description: 'Complete the buyer profile before moving to search.', badge: 'setup' },
  search_ready: { label: 'Search-Ready', description: 'Contact and budget confirmed. Ready to start the property search.', badge: 'ready' },
  showing: { label: 'Showing Phase', description: 'Profile is complete. Focus on showings, comparisons, and offer preparation.', badge: 'active' },
  offer_ready: { label: 'Offer-Ready', description: 'Buyer is prepared to make offers. Focus on negotiations and closing.', badge: 'active' },
};

export default function BuyerAIContent({ buyer, onBuyerUpdate }: BuyerAIContentProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Workflow state
  const workflowState = useMemo(() => getWorkflowState('buyer', buyer.id), [buyer.id]);
  const resumeSummary = useMemo(() => getResumeSummary('buyer', buyer.id), [buyer.id]);

  const completion = useMemo(
    () => computeBuyerCompletion(buyer, workflowState.lastCompletedActionKey),
    [buyer, workflowState.lastCompletedActionKey]
  );
  const phase = useMemo(() => getBuyerPhase(buyer), [buyer]);
  const phaseInfo = PHASE_CONFIG[phase];
  const groupedActions = useMemo(() => getBuyerGroupedActions(completion, phase), [completion, phase]);

  useEffect(() => {
    setLastNextStep('buyer', buyer.id, completion.nextStep?.key ?? null);
  }, [completion.nextStep, buyer.id]);

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

  /** Build a full context snapshot of the buyer record for the AI */
  const buildBuyerContext = useCallback(() => {
    return `You are an AI transaction coordinator for a real estate buyer client. You already have full access to this buyer record — NEVER ask for information that is provided below. Use this context to answer questions, generate content, and identify gaps.

=== BUYER RECORD (Current State) ===
Name: ${buyer.firstName} ${buyer.lastName}
Email: ${buyer.email || 'NOT SET'}
Phone: ${buyer.phone || 'NOT SET'}
Status: ${buyer.status}
Pre-Approved Amount: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'NOT SET'}
Commission: ${buyer.commissionPercentage ? buyer.commissionPercentage + '%' : 'NOT SET'}
Agent Commission: ${buyer.agentCommission ? '$' + buyer.agentCommission.toLocaleString() : 'NOT SET'}

=== WANTS & NEEDS ===
${buyer.wantsNeeds || 'NOT SET — needs to be captured from the agent'}

=== BROKERAGE INFO ===
Brokerage: ${buyer.brokerageName || 'NOT SET'}
Brokerage Address: ${buyer.brokerageAddress || 'NOT SET'}
Agent Name: ${buyer.agentName || 'NOT SET'}
Agent Email: ${buyer.agentEmail || 'NOT SET'}

=== INSTRUCTIONS ===
- NEVER ask for the buyer's name, email, phone, pre-approval amount, or any field shown above that has a value.
- If a field above says "NOT SET", you may ask for it or note it as a gap.
- When drafting messages or follow-ups, use the buyer's actual name and known details.
- Proactively identify profile gaps and offer to fill them or create tasks.
- Act like a transaction coordinator who already knows the file. Be direct and actionable.
- Format responses cleanly with markdown.`;
  }, [buyer]);

  /** Send a message to the AI chat */
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
      const contextMessage = { role: 'user' as const, content: buildBuyerContext() };
      const contextAck = { role: 'assistant' as const, content: 'Understood. I have full access to this buyer record and will use all available data without asking for information I already have.' };
      const history = [
        contextMessage,
        contextAck,
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const { content } = await invokeClozzeAICreate({
        flow: 'buyer',
        message: message.trim(),
        conversationHistory: history,
        existingFormData: {
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          email: buyer.email,
          phone: buyer.phone,
          status: buyer.status,
          preApprovedAmount: buyer.preApprovedAmount,
          wantsNeeds: buyer.wantsNeeds,
          commissionPercentage: buyer.commissionPercentage,
        },
      });

      setChatMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: content.trim(), contentType: contentType || 'general' } : m)
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
  }, [chatLoading, toast, buildBuyerContext, chatMessages, buyer]);

  /** Apply structured needs to buyer profile */
  const handleApplyToProfile = async (content: string) => {
    try {
      const { error } = await supabase.from('buyers').update({ wants_needs: content }).eq('id', buyer.id);
      if (error) throw error;
      onBuyerUpdate?.({ ...buyer, wantsNeeds: content });
      flashComplete('wantsNeeds');
      recordAction('buyer', buyer.id, 'apply_structured_needs', 'Applied structured wants/needs');
      toast({ title: "✓ Saved", description: "Structured wants/needs saved to buyer profile." });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  /** Quick-action buttons that send pre-built prompts to the chat */
  const handleQuickAction = (type: string) => {
    const prompts: Record<string, { message: string; contentType: ChatMessage['contentType'] }> = {
      audit: {
        message: `Run a buyer readiness audit for this buyer profile. Evaluate what is known, what is missing, and recommend next steps.

Buyer: ${buyer.firstName} ${buyer.lastName}
Email: ${buyer.email || 'N/A'}
Phone: ${buyer.phone || 'N/A'}
Status: ${buyer.status}
Pre-Approved Amount: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'NOT SET'}
Wants/Needs: ${buyer.wantsNeeds || 'NOT SET'}
Commission: ${buyer.commissionPercentage || 'N/A'}%`,
        contentType: 'audit',
      },
      structure_needs: {
        message: `Structure this buyer's wants and needs into clear categories. Take the raw input and organize it.

Raw Wants/Needs: "${buyer.wantsNeeds || 'No preferences recorded yet'}"
Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'Not specified'}

Organize into Must-Haves, Nice-to-Haves, Dealbreakers, Budget Analysis, and Questions to Ask.`,
        contentType: 'structured_needs',
      },
      follow_up: {
        message: `Write a professional follow-up message to buyer ${buyer.firstName} ${buyer.lastName}. Their needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Keep it warm, concise, and action-oriented.`,
        contentType: 'draft',
      },
      next_steps: {
        message: `Write a brief next-steps summary for buyer ${buyer.firstName} ${buyer.lastName}. Status: ${buyer.status}. Needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Format as a clear action list.`,
        contentType: 'draft',
      },
      showing: {
        message: `Write a showing coordination message for buyer ${buyer.firstName} ${buyer.lastName}. Their preferences: ${buyer.wantsNeeds || 'not specified'}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}.`,
        contentType: 'draft',
      },
      offer_prep: {
        message: `Write an offer preparation summary for buyer ${buyer.firstName} ${buyer.lastName}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}. Include key items to prepare before submitting an offer.`,
        contentType: 'draft',
      },
      send_listings: {
        message: `Write a message to buyer ${buyer.firstName} ${buyer.lastName} introducing curated property listings that match their criteria. Their needs: ${buyer.wantsNeeds || 'not specified'}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}.`,
        contentType: 'draft',
      },
    };
    const p = prompts[type];
    if (p) sendChatMessage(p.message, p.contentType);
  };

  const handleCreateContextTasks = async () => {
    if (!user) return;
    setCreatingTasks(true);
    try {
      const taskBundle = getBuyerTaskBundle(completion, buyer);
      const tasks = taskBundle.map(t => ({
        user_id: user.id,
        title: `${t.title} — ${buyer.firstName} ${buyer.lastName}`,
        priority: t.priority,
        status: 'pending',
        buyer_id: buyer.id,
      }));
      const { error } = await supabase.from('tasks').insert(tasks);
      if (error) throw error;
      recordAction('buyer', buyer.id, 'create_tasks', `Created ${tasks.length} tasks`);
      toast({ title: "✓ Tasks created", description: `${tasks.length} tasks created based on current buyer state.` });
    } catch (err) {
      console.error('Task creation error:', err);
      toast({ title: "Error", description: "Failed to create tasks.", variant: "destructive" });
    } finally {
      setCreatingTasks(false);
    }
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
              Buyer Profile {completion.percentage}% Complete
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
              {buyer.wantsNeeds && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('structure_needs')} disabled={chatLoading}>
                  <ClipboardList className="h-3 w-3" /> Structure Needs
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('follow_up')} disabled={chatLoading}>
                <MessageSquare className="h-3 w-3" /> Draft Follow-Up
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('next_steps')} disabled={chatLoading}>
                <ListTodo className="h-3 w-3" /> Next Steps
              </Button>
              {(phase === 'search_ready' || phase === 'showing') && (
                <>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('send_listings')} disabled={chatLoading}>
                    <Home className="h-3 w-3" /> Send Listings
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('showing')} disabled={chatLoading}>
                    <Search className="h-3 w-3" /> Schedule Showings
                  </Button>
                </>
              )}
              {phase === 'showing' && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleQuickAction('offer_prep')} disabled={chatLoading}>
                  <DollarSign className="h-3 w-3" /> Prepare Offer
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleCreateContextTasks} disabled={creatingTasks}>
                {creatingTasks ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListChecks className="h-3 w-3" />}
                Create Tasks ({getBuyerTaskBundle(completion, buyer).length})
              </Button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="max-h-[400px]" ref={chatScrollRef as any}>
              <div className="p-3 space-y-3">
                {chatMessages.length === 0 && !chatLoading && (
                  <div className="text-center py-6">
                    <Bot className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Ask anything about this buyer, or use the buttons above to generate content.
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
                          {/* Apply buttons */}
                          {msg.content && !chatLoading && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                              {msg.contentType === 'structured_needs' && (
                                <Button variant="outline" size="sm" className="h-6 px-2.5 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10" onClick={() => handleApplyToProfile(msg.content)}>
                                  <Save className="h-3 w-3" /> Save to Profile
                                </Button>
                              )}
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
                  placeholder="Ask about this buyer or request content…"
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

      {/* Phase Card */}
      {phase !== 'profiling' && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{phaseInfo.label}</span>
            <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">{phaseInfo.badge}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{phaseInfo.description}</p>
        </div>
      )}

      {/* Next Step */}
      {completion.nextStep && phase === 'profiling' && (
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
    </div>
  );
}
