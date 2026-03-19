import { useState } from "react";
import { ClipboardList, Loader2, Wand2, Copy, UserCheck, MessageSquare, ListTodo, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { BuyerData } from "@/contexts/BuyersContext";

interface BuyerAIContentProps {
  buyer: BuyerData;
  onBuyerUpdate?: (updatedBuyer: BuyerData) => void;
}

export default function BuyerAIContent({ buyer, onBuyerUpdate }: BuyerAIContentProps) {
  const { toast } = useToast();
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [structuredResult, setStructuredResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  // Run buyer profile audit
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
        body: {
          flow: 'buyer',
          message: auditPrompt,
          context: {
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            email: buyer.email,
            preApprovedAmount: buyer.preApprovedAmount,
            wantsNeeds: buyer.wantsNeeds,
          },
        },
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

  // Structure wants/needs
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
        body: {
          flow: 'buyer',
          message: prompt,
          context: {
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            wantsNeeds: buyer.wantsNeeds,
            preApprovedAmount: buyer.preApprovedAmount,
          },
        },
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

  // Save structured needs back to buyer
  const handleSaveStructuredNeeds = async () => {
    if (!structuredResult) return;
    try {
      const { error } = await supabase
        .from('buyers')
        .update({ wants_needs: structuredResult })
        .eq('id', buyer.id);
      if (error) throw error;
      onBuyerUpdate?.({ ...buyer, wantsNeeds: structuredResult });
      toast({ title: "Saved", description: "Structured wants/needs saved to buyer profile." });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  // Generate follow-up draft
  const handleGenerateDraft = async (type: 'follow_up' | 'next_steps' | 'showing') => {
    setGenerating(type);
    try {
      const prompts: Record<string, string> = {
        follow_up: `Write a professional follow-up message to buyer ${buyer.firstName} ${buyer.lastName}. Their needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Keep it warm, concise, and action-oriented.`,
        next_steps: `Write a brief next-steps summary for buyer ${buyer.firstName} ${buyer.lastName}. Status: ${buyer.status}. Needs: ${buyer.wantsNeeds || 'not specified'}. Pre-approved: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not yet'}. Format as a clear action list.`,
        showing: `Write a showing coordination message for buyer ${buyer.firstName} ${buyer.lastName}. Their preferences: ${buyer.wantsNeeds || 'not specified'}. Budget: ${buyer.preApprovedAmount ? '$' + buyer.preApprovedAmount.toLocaleString() : 'not specified'}. Include scheduling logistics.`,
      };

      const { data, error } = await supabase.functions.invoke('clozze-ai-create', {
        body: {
          flow: 'buyer',
          message: prompts[type],
          context: {
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            email: buyer.email,
          },
        },
      });

      if (error) throw error;
      const content = data?.response || data?.content || '';
      if (content) {
        // Show in structured result area for review
        setStructuredResult(content);
        toast({ title: "Draft Generated", description: "Review the draft below." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate draft.", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const hasWantsNeeds = buyer.wantsNeeds && buyer.wantsNeeds.trim().length > 0;
  const hasPreApproval = buyer.preApprovedAmount && buyer.preApprovedAmount > 0;

  return (
    <div className="space-y-6 py-4">
      {/* Complete Buyer Profile Action */}
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Complete Buyer Profile</h4>
              <p className="text-xs text-muted-foreground">AI audit and structured profile completion</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleProfileAudit}
            disabled={auditRunning}
            className="gap-1.5"
          >
            {auditRunning ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Auditing…</>
            ) : (
              <><Wand2 className="h-3.5 w-3.5" /> Run Audit</>
            )}
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-primary/10">
          {hasWantsNeeds && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleStructureNeeds}
              disabled={structuring}
            >
              {structuring ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardList className="h-3 w-3" />}
              Structure Wants/Needs
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleGenerateDraft('follow_up')}
            disabled={!!generating}
          >
            {generating === 'follow_up' ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
            Draft Follow-Up
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleGenerateDraft('next_steps')}
            disabled={!!generating}
          >
            {generating === 'next_steps' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListTodo className="h-3 w-3" />}
            Next Steps
          </Button>
        </div>
      </div>

      {/* Profile Completeness Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg border ${hasWantsNeeds ? 'bg-muted/20 border-border/50' : 'bg-warning/5 border-warning/20'}`}>
          <p className="text-xs font-medium text-foreground">{hasWantsNeeds ? '✅' : '⚠️'} Wants/Needs</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{hasWantsNeeds ? 'Recorded' : 'Not set'}</p>
        </div>
        <div className={`p-3 rounded-lg border ${hasPreApproval ? 'bg-muted/20 border-border/50' : 'bg-warning/5 border-warning/20'}`}>
          <p className="text-xs font-medium text-foreground">{hasPreApproval ? '✅' : '⚠️'} Pre-Approval</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{hasPreApproval ? `$${buyer.preApprovedAmount!.toLocaleString()}` : 'Not set'}</p>
        </div>
        <div className={`p-3 rounded-lg border ${buyer.email ? 'bg-muted/20 border-border/50' : 'bg-warning/5 border-warning/20'}`}>
          <p className="text-xs font-medium text-foreground">{buyer.email ? '✅' : '⚠️'} Email</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{buyer.email || 'Not set'}</p>
        </div>
        <div className={`p-3 rounded-lg border ${buyer.phone ? 'bg-muted/20 border-border/50' : 'bg-warning/5 border-warning/20'}`}>
          <p className="text-xs font-medium text-foreground">{buyer.phone ? '✅' : '⚠️'} Phone</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{buyer.phone || 'Not set'}</p>
        </div>
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Profile Audit Results</h4>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleCopy(auditResult, 'Audit')}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAuditResult(null)}>
                Dismiss
              </Button>
            </div>
          </div>
          <div className="text-sm">
            {auditResult.split('\n').map((line, i) => {
              if (line.startsWith('## ')) {
                return <h3 key={i} className="text-sm font-semibold mt-3 mb-1">{line.replace('## ', '')}</h3>;
              }
              if (line.startsWith('- [ ] ')) {
                return <p key={i} className="text-sm text-muted-foreground ml-2">☐ {line.replace('- [ ] ', '')}</p>;
              }
              if (line.startsWith('- ')) {
                return <p key={i} className="text-sm text-muted-foreground ml-2">• {line.replace('- ', '')}</p>;
              }
              if (line.trim()) {
                return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
              }
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
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleSaveStructuredNeeds}>
                Save to Profile
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setStructuredResult(null)}>
                Dismiss
              </Button>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap text-muted-foreground">
            {structuredResult}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!auditResult && !structuredResult && (
        <div className="text-center py-6 space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Run a profile audit to see what's complete and what's missing, or use the quick actions above to structure needs and generate drafts.
          </p>
        </div>
      )}
    </div>
  );
}
