import { useState, useMemo, useEffect, useCallback } from "react";
import { ClipboardList, Loader2, Wand2, Copy, UserCheck, MessageSquare, ListTodo, Sparkles, Circle, CheckCircle2, ChevronRight, ListChecks, Save, ArrowRight, AlertTriangle, Search, FileCheck, Home, FileText, DollarSign, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeClozzeAICreate } from "@/lib/invokeClozzeAICreate";
import type { BuyerData } from "@/contexts/BuyersContext";
import { computeBuyerCompletion, getBuyerPhase, getBuyerTaskBundle, getBuyerGroupedActions, type CompletionItem, type BuyerPhase } from "@/lib/completionTracking";
import { getWorkflowState, recordAction, setLastNextStep, setGroupedFlowInProgress, getResumeSummary } from "@/lib/workflowState";

interface BuyerAIContentProps {
  buyer: BuyerData;
  onBuyerUpdate?: (updatedBuyer: BuyerData) => void;
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
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [structuredResult, setStructuredResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [groupedFlowRunning, setGroupedFlowRunning] = useState<string | null>(null);
  const [groupedFlowProgress, setGroupedFlowProgress] = useState<{ total: number; done: number; current: string } | null>(null);

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

  // Persist next step
  useEffect(() => {
    setLastNextStep('buyer', buyer.id, completion.nextStep?.key ?? null);
  }, [completion.nextStep, buyer.id]);

  const flashComplete = (key: string) => {
    setJustCompleted(key);
    setTimeout(() => setJustCompleted(null), 2000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const handleProfileAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    try {
      const auditPrompt = `Run a buyer readiness audit for this buyer profile. Evaluate what is known, what is missing, and recommend next steps.

Buyer: ${buyer.firstName} ${buyer.lastName}
Email: ${buyer.email || 'N/A'}
Phone: ${buyer.phone || 'N/A'}
Status: ${buyer.status}
Pre-Approved Amount: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'NOT SET'}
Wants/Needs: ${buyer.wantsNeeds || 'NOT SET'}
Commission: ${buyer.commissionPercentage || 'N/A'}%

Use this exact format:
## ✅ Known Information
- List what we know about this buyer

## ⚠️ Missing Information
- [ ] Each missing item as a checkbox

## 📋 Recommended Actions
- What the agent should do next

## 💬 Suggested Questions
- Questions the agent should ask the buyer

## 📌 Next Steps
- Prioritized list of actions`;

      const { data, error } = await supabase.functions.invoke('clozze-ai-create', {
        body: { flow: 'buyer', message: auditPrompt, context: { buyerName: `${buyer.firstName} ${buyer.lastName}`, email: buyer.email, preApprovedAmount: buyer.preApprovedAmount, wantsNeeds: buyer.wantsNeeds } },
      });
      if (error) throw error;
      setAuditResult(data?.response || data?.content || 'No audit results generated.');
      recordAction('buyer', buyer.id, 'run_audit', 'Ran buyer profile audit');
    } catch (err) {
      console.error('Audit error:', err);
      toast({ title: "Error", description: "Failed to run audit.", variant: "destructive" });
    } finally {
      setAuditRunning(false);
    }
  };

  const handleStructureNeeds = useCallback(async () => {
    setStructuring(true);
    setStructuredResult(null);
    try {
      const prompt = `Structure this buyer's wants and needs into clear categories. Take the raw input and organize it.

Raw Wants/Needs: "${buyer.wantsNeeds || 'No preferences recorded yet'}"
Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'Not specified'}

Organize into:
## 🎯 Must-Haves
- Critical requirements

## ✨ Nice-to-Haves
- Preferred but flexible

## 🚫 Dealbreakers
- Absolute no-gos

## 💰 Budget Analysis
- Brief assessment of budget vs expectations

## ❓ Questions to Ask
- What additional information should the agent gather?`;

      const { data, error } = await supabase.functions.invoke('clozze-ai-create', {
        body: { flow: 'buyer', message: prompt, context: { buyerName: `${buyer.firstName} ${buyer.lastName}`, wantsNeeds: buyer.wantsNeeds, preApprovedAmount: buyer.preApprovedAmount } },
      });
      if (error) throw error;
      setStructuredResult(data?.response || data?.content || 'No structured output generated.');
      recordAction('buyer', buyer.id, 'structure_needs', 'Structured buyer wants/needs');
    } catch (err) {
      console.error('Structure error:', err);
      toast({ title: "Error", description: "Failed to structure needs.", variant: "destructive" });
    } finally {
      setStructuring(false);
    }
  }, [buyer, toast]);

  const handleSaveStructuredNeeds = async () => {
    if (!structuredResult) return;
    try {
      const { error } = await supabase.from('buyers').update({ wants_needs: structuredResult }).eq('id', buyer.id);
      if (error) throw error;
      onBuyerUpdate?.({ ...buyer, wantsNeeds: structuredResult });
      flashComplete('wantsNeeds');
      recordAction('buyer', buyer.id, 'save_structured_needs', 'Saved structured wants/needs');
      toast({ title: "✓ Saved", description: "Structured wants/needs saved to buyer profile." });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const handleGenerateDraft = useCallback(async (type: 'follow_up' | 'next_steps' | 'showing' | 'offer_prep' | 'send_listings') => {
    setGenerating(type);
    try {
      const prompts: Record<string, string> = {
        follow_up: `Write a professional follow-up message to buyer ${buyer.firstName} ${buyer.lastName}. Their needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Keep it warm, concise, and action-oriented.`,
        next_steps: `Write a brief next-steps summary for buyer ${buyer.firstName} ${buyer.lastName}. Status: ${buyer.status}. Needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Format as a clear action list.`,
        showing: `Write a showing coordination message for buyer ${buyer.firstName} ${buyer.lastName}. Their preferences: ${buyer.wantsNeeds || 'not specified'}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}. Include scheduling logistics and what to prepare.`,
        offer_prep: `Write an offer preparation summary for buyer ${buyer.firstName} ${buyer.lastName}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}. Needs: ${buyer.wantsNeeds || 'not specified'}. Include key items to prepare before submitting an offer: pre-approval confirmation, earnest money, contingencies, and timeline.`,
        send_listings: `Write a message to buyer ${buyer.firstName} ${buyer.lastName} introducing curated property listings that match their criteria. Their needs: ${buyer.wantsNeeds || 'not specified'}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}. Keep it professional and include a call to action to schedule viewings.`,
      };

      const { data, error } = await supabase.functions.invoke('clozze-ai-create', {
        body: { flow: 'buyer', message: prompts[type], context: { buyerName: `${buyer.firstName} ${buyer.lastName}`, email: buyer.email } },
      });
      if (error) throw error;
      const content = data?.response || data?.content || '';
      if (content) {
        setStructuredResult(content);
        recordAction('buyer', buyer.id, `generate_${type}`, `Generated ${type.replace(/_/g, ' ')} draft`);
        toast({ title: "Draft Generated", description: "Review the draft below." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate draft.", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  }, [buyer, toast]);

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

  // Grouped action execution
  const handleGroupedAction = async (actionId: string) => {
    const action = groupedActions.find(a => a.id === actionId);
    if (!action) return;

    setGroupedFlowRunning(actionId);
    setGroupedFlowInProgress('buyer', buyer.id, actionId);

    const steps = action.actionTypes;
    for (let i = 0; i < steps.length; i++) {
      setGroupedFlowProgress({ total: steps.length, done: i, current: steps[i] });

      if (steps[i] === 'structure_needs') {
        await handleStructureNeeds();
      } else if (steps[i] === 'send_listings') {
        await handleGenerateDraft('send_listings');
      } else if (steps[i] === 'create_showing_tasks') {
        await handleCreateContextTasks();
      } else if (steps[i] === 'offer_prep') {
        await handleGenerateDraft('offer_prep');
      } else if (steps[i] === 'create_offer_tasks') {
        await handleCreateContextTasks();
      }
    }

    setGroupedFlowProgress(null);
    setGroupedFlowRunning(null);
    setGroupedFlowInProgress('buyer', buyer.id, null);
    recordAction('buyer', buyer.id, `grouped_${actionId}`, `Completed: ${action.label}`);
    toast({ title: "✓ Flow complete", description: `${action.label} — all steps finished.` });
  };

  const completeItems = completion.items.filter(i => i.complete);

  return (
    <div className="space-y-5 py-4">
      {/* Resume Banner */}
      {resumeSummary.hasHistory && resumeSummary.lastAction && !groupedFlowRunning && (
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

      {/* Grouped Flow Progress */}
      {groupedFlowProgress && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm font-semibold text-foreground">
              Running flow… ({groupedFlowProgress.done + 1}/{groupedFlowProgress.total})
            </span>
          </div>
          <Progress value={(groupedFlowProgress.done / groupedFlowProgress.total) * 100} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            Current step: {groupedFlowProgress.current.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      {/* Phase Card — context-aware based on buyer state */}
      {phase !== 'profiling' && !groupedFlowRunning ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{phaseInfo.label}</span>
            <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">{phaseInfo.badge}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{phaseInfo.description}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {(phase === 'search_ready' || phase === 'showing') && (
              <>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('send_listings')} disabled={!!generating}>
                  {generating === 'send_listings' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Home className="h-3 w-3" />}
                  Send Listings
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('showing')} disabled={!!generating}>
                  {generating === 'showing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                  Schedule Showings
                </Button>
              </>
            )}
            {phase === 'showing' && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('offer_prep')} disabled={!!generating}>
                {generating === 'offer_prep' ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
                Prepare Offer
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('next_steps')} disabled={!!generating}>
              {generating === 'next_steps' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListTodo className="h-3 w-3" />}
              Next Steps
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('follow_up')} disabled={!!generating}>
              {generating === 'follow_up' ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
              Draft Follow-Up
            </Button>
          </div>
        </div>
      ) : !groupedFlowRunning && completion.nextStep ? (
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
            {completion.nextStep.actionType === 'structure_needs' && buyer.wantsNeeds && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleStructureNeeds} disabled={structuring}>
                {structuring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Structure
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
      ) : null}

      {/* Grouped Actions */}
      {groupedActions.length > 0 && !groupedFlowRunning && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Quick Flows
          </h4>
          <div className="space-y-1.5">
            {groupedActions.map(action => (
              <button
                key={action.id}
                className="w-full text-left rounded-lg border border-border bg-muted/20 hover:bg-muted/40 p-2.5 transition-colors"
                onClick={() => handleGroupedAction(action.id)}
                disabled={!!generating || !!groupedFlowRunning}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  <Badge variant="outline" className="text-[9px] h-4 ml-auto">{action.actionTypes.length} steps</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-5">{action.description}</p>
              </button>
            ))}
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
                {item.actionType === 'structure_needs' && buyer.wantsNeeds && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary" onClick={handleStructureNeeds} disabled={structuring}>
                    {structuring ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Structure'}
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
        <Button size="sm" onClick={handleProfileAudit} disabled={auditRunning} className="gap-1.5">
          {auditRunning ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Auditing…</> : <><Wand2 className="h-3.5 w-3.5" /> Run Audit</>}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCreateContextTasks} disabled={creatingTasks} className="gap-1.5">
          {creatingTasks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
          Create Tasks ({getBuyerTaskBundle(completion, buyer).length})
        </Button>
      </div>

      {/* Quick Drafts — only in profiling phase */}
      {phase === 'profiling' && !groupedFlowRunning && (
        <div className="flex flex-wrap gap-2">
          {buyer.wantsNeeds && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleStructureNeeds} disabled={structuring}>
              {structuring ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardList className="h-3 w-3" />}
              Structure Wants/Needs
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('follow_up')} disabled={!!generating}>
            {generating === 'follow_up' ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
            Draft Follow-Up
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('next_steps')} disabled={!!generating}>
            {generating === 'next_steps' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListTodo className="h-3 w-3" />}
            Next Steps
          </Button>
        </div>
      )}

      {/* Audit Results */}
      {auditResult && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Profile Audit</h4>
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
        </div>
      )}

      {/* Structured Result / Draft */}
      {structuredResult && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">AI Output</h4>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleCopy(structuredResult, 'Output')}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleSaveStructuredNeeds}>
                <Save className="h-3 w-3" /> Save to Profile
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setStructuredResult(null)}>Dismiss</Button>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap text-muted-foreground">{structuredResult}</div>
        </div>
      )}
    </div>
  );
}
