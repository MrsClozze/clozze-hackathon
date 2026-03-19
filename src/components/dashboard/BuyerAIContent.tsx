import { useState, useMemo } from "react";
import { ClipboardList, Loader2, Wand2, Copy, UserCheck, MessageSquare, ListTodo, Sparkles, Circle, CheckCircle2, ChevronRight, ListChecks, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { BuyerData } from "@/contexts/BuyersContext";
import { computeBuyerCompletion, BUYER_ONBOARDING_TASKS, type CompletionItem } from "@/lib/completionTracking";

interface BuyerAIContentProps {
  buyer: BuyerData;
  onBuyerUpdate?: (updatedBuyer: BuyerData) => void;
}

export default function BuyerAIContent({ buyer, onBuyerUpdate }: BuyerAIContentProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [structuredResult, setStructuredResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [creatingTasks, setCreatingTasks] = useState(false);

  const completion = useMemo(() => computeBuyerCompletion(buyer), [buyer]);

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
    } catch (err) {
      console.error('Audit error:', err);
      toast({ title: "Error", description: "Failed to run audit.", variant: "destructive" });
    } finally {
      setAuditRunning(false);
    }
  };

  const handleStructureNeeds = async () => {
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
    } catch (err) {
      console.error('Structure error:', err);
      toast({ title: "Error", description: "Failed to structure needs.", variant: "destructive" });
    } finally {
      setStructuring(false);
    }
  };

  const handleSaveStructuredNeeds = async () => {
    if (!structuredResult) return;
    try {
      const { error } = await supabase.from('buyers').update({ wants_needs: structuredResult }).eq('id', buyer.id);
      if (error) throw error;
      onBuyerUpdate?.({ ...buyer, wantsNeeds: structuredResult });
      toast({ title: "Saved", description: "Structured wants/needs saved to buyer profile." });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const handleGenerateDraft = async (type: 'follow_up' | 'next_steps' | 'showing') => {
    setGenerating(type);
    try {
      const prompts: Record<string, string> = {
        follow_up: `Write a professional follow-up message to buyer ${buyer.firstName} ${buyer.lastName}. Their needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Keep it warm, concise, and action-oriented.`,
        next_steps: `Write a brief next-steps summary for buyer ${buyer.firstName} ${buyer.lastName}. Status: ${buyer.status}. Needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Format as a clear action list.`,
        showing: `Write a showing coordination message for buyer ${buyer.firstName} ${buyer.lastName}. Their preferences: ${buyer.wantsNeeds || 'not specified'}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}. Include scheduling logistics.`,
      };

      const { data, error } = await supabase.functions.invoke('clozze-ai-create', {
        body: { flow: 'buyer', message: prompts[type], context: { buyerName: `${buyer.firstName} ${buyer.lastName}`, email: buyer.email } },
      });
      if (error) throw error;
      const content = data?.response || data?.content || '';
      if (content) {
        setStructuredResult(content);
        toast({ title: "Draft Generated", description: "Review the draft below." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate draft.", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const handleCreateOnboardingTasks = async () => {
    if (!user) return;
    setCreatingTasks(true);
    try {
      const tasks = BUYER_ONBOARDING_TASKS.map(t => ({
        user_id: user.id,
        title: `${t.title} — ${buyer.firstName} ${buyer.lastName}`,
        priority: t.priority,
        status: 'pending',
        buyer_id: buyer.id,
      }));
      const { error } = await supabase.from('tasks').insert(tasks);
      if (error) throw error;
      toast({ title: "Tasks Created", description: `${tasks.length} buyer onboarding tasks created.` });
    } catch (err) {
      console.error('Task creation error:', err);
      toast({ title: "Error", description: "Failed to create tasks.", variant: "destructive" });
    } finally {
      setCreatingTasks(false);
    }
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
              Buyer Profile {completion.percentage}% Complete
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {completion.completeCount}/{completion.totalCount} fields
          </span>
        </div>
        <Progress value={completion.percentage} className="h-2" />
      </div>

      {/* Proactive Suggestions (incomplete items) */}
      {incompleteItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Missing Items</h4>
          <div className="space-y-1.5">
            {incompleteItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
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
        <Button variant="outline" size="sm" onClick={handleCreateOnboardingTasks} disabled={creatingTasks} className="gap-1.5">
          {creatingTasks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
          Create Onboarding Tasks
        </Button>
      </div>

      {/* Quick Drafts */}
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
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleGenerateDraft('showing')} disabled={!!generating}>
          {generating === 'showing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
          Showing Coordination
        </Button>
      </div>

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
