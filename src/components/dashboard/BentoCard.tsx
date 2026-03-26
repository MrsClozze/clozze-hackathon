import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  elevated?: boolean;
}

export default function BentoCard({ 
  children, 
  className, 
  title, 
  subtitle, 
  action,
  elevated = false 
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-card-border p-6 transition-all duration-300",
        elevated 
          ? "bg-card-elevated shadow-elevated" 
          : "bg-card shadow-card hover:shadow-elevated",
        "animate-scale-in",
        className
      )}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-text-heading mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-text-muted">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      <div className="animate-fade-in">
        {children}
      </div>
    </div>
  );
}