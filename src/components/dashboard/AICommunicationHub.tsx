import { MessageSquare, Mail, ArrowRight, ChevronDown } from "lucide-react";
import BentoCard from "./BentoCard";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Mock data for AI-analyzed communications
const mockTextMessages = [
  {
    id: 1,
    sender: "Sarah Johnson",
    snippet: "Hey, I got pre-approved for $500,000 today!",
    actionItem: "Looks like your client Sarah Johnson got approved for $500k. Let's send them a date where we can go look at houses and start sending them options.",
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    sender: "Michael Chen",
    snippet: "Can we schedule a showing for this weekend?",
    actionItem: "Michael Chen wants to schedule a showing. Check your calendar and propose available times for this weekend.",
    timestamp: "5 hours ago",
  },
  {
    id: 3,
    sender: "Emily Davis",
    snippet: "We're ready to make an offer on the property",
    actionItem: "Emily Davis is ready to make an offer. Prepare the offer documents and discuss pricing strategy.",
    timestamp: "1 day ago",
  },
];

const mockEmailMessages = [
  {
    id: 1,
    sender: "John Smith",
    subject: "Re: 123 Main St Inspection Report",
    snippet: "The inspector found some issues with the roof...",
    actionItem: "Review the inspection report for 123 Main St with John Smith. Schedule a call to discuss roof repair negotiations with the seller.",
    timestamp: "3 hours ago",
  },
  {
    id: 2,
    sender: "Lisa Park",
    subject: "Pre-approval Letter Attached",
    snippet: "Attached is my pre-approval letter for $750,000",
    actionItem: "Lisa Park sent her pre-approval letter. Update her buyer profile and start sending properties in her price range.",
    timestamp: "6 hours ago",
  },
];

interface AICommunicationHubProps {
  limit?: number;
}

export default function AICommunicationHub({ limit }: AICommunicationHubProps = {}) {
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);

  const shouldLimitText = limit && !isTextExpanded;
  const shouldLimitEmail = limit && !isEmailExpanded;
  
  const displayedTextMessages = shouldLimitText ? mockTextMessages.slice(0, limit) : mockTextMessages;
  const displayedEmailMessages = shouldLimitEmail ? mockEmailMessages.slice(0, limit) : mockEmailMessages;
  
  const hasMoreTextMessages = limit && mockTextMessages.length > limit;
  const hasMoreEmailMessages = limit && mockEmailMessages.length > limit;

  return (
    <div className="w-full space-y-6">
      {/* Text Messages Section */}
      <BentoCard
        title="Text"
        subtitle="AI-analyzed text messages"
        className="h-full"
        elevated
      >
        <div className="space-y-4">
          {displayedTextMessages.map((message) => (
            <div
              key={message.id}
              className="p-4 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 group cursor-pointer"
            >
              {/* Message Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-accent-gold" />
                  <h4 className="text-sm font-semibold text-text-heading">
                    {message.sender}
                  </h4>
                </div>
                <span className="text-xs text-text-muted">{message.timestamp}</span>
              </div>

              {/* Original Message Snippet */}
              <p className="text-xs text-text-subtle italic mb-3 border-l-2 border-accent-gold/30 pl-3">
                "{message.snippet}"
              </p>

              {/* AI Action Item */}
              <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-md p-3">
                <p className="text-xs text-text-heading leading-relaxed">
                  {message.actionItem}
                </p>
              </div>

              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs group-hover:text-accent-gold transition-colors"
              >
                Take Action
                <ArrowRight className="h-3 w-3 ml-2" />
              </Button>
            </div>
          ))}

          {displayedTextMessages.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No text messages to analyze</p>
              <p className="text-xs mt-1">Connect your phone in Integrations</p>
            </div>
          )}

          {hasMoreTextMessages && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setIsTextExpanded(!isTextExpanded)}
            >
              {isTextExpanded ? 'Show Less' : `View All (${mockTextMessages.length} messages)`}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isTextExpanded ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
      </BentoCard>

      {/* Email Section */}
      <BentoCard
        title="Email"
        subtitle="AI-analyzed emails"
        className="h-full"
        elevated
      >
        <div className="space-y-4">
          {displayedEmailMessages.map((email) => (
            <div
              key={email.id}
              className="p-4 rounded-lg bg-background-elevated border border-card-border hover:border-accent-gold/30 transition-all duration-200 group cursor-pointer"
            >
              {/* Email Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-accent-gold" />
                  <h4 className="text-sm font-semibold text-text-heading">
                    {email.sender}
                  </h4>
                </div>
                <span className="text-xs text-text-muted">{email.timestamp}</span>
              </div>

              {/* Email Subject */}
              <p className="text-xs font-medium text-text-body mb-2">
                {email.subject}
              </p>

              {/* Original Email Snippet */}
              <p className="text-xs text-text-subtle italic mb-3 border-l-2 border-accent-gold/30 pl-3">
                "{email.snippet}"
              </p>

              {/* AI Action Item */}
              <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-md p-3">
                <p className="text-xs text-text-heading leading-relaxed">
                  {email.actionItem}
                </p>
              </div>

              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs group-hover:text-accent-gold transition-colors"
              >
                Take Action
                <ArrowRight className="h-3 w-3 ml-2" />
              </Button>
            </div>
          ))}

          {displayedEmailMessages.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No emails to analyze</p>
              <p className="text-xs mt-1">Connect your email in Integrations</p>
            </div>
          )}

          {hasMoreEmailMessages && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setIsEmailExpanded(!isEmailExpanded)}
            >
              {isEmailExpanded ? 'Show Less' : `View All (${mockEmailMessages.length} messages)`}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isEmailExpanded ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
      </BentoCard>
    </div>
  );
}
