import { Badge } from "@/components/ui/badge";

interface TaskAssistantSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading: boolean;
}

export default function TaskAssistantSuggestions({
  suggestions,
  onSelect,
  isLoading,
}: TaskAssistantSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="px-3 py-2 border-t border-border bg-muted/20">
      <p className="text-xs text-muted-foreground mb-1.5">Suggestions</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSelect(suggestion)}
            disabled={isLoading}
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
