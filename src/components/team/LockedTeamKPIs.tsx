import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import BentoCard from "@/components/dashboard/BentoCard";
import TeamMemberUpgradeModal from "./TeamMemberUpgradeModal";

export default function LockedTeamKPIs() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <>
      <BentoCard title="Add Team Members" subtitle="Expand your team">
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-text-heading mb-3">
            Want to add team members onto your plan to start assigning tasks to?
          </h3>
          <p className="text-text-muted mb-6 max-w-md">
            Add team members to your Pro account for $9.99 per user per month. Perfect for bringing on an assistant or colleague to help manage your deals and tasks.
          </p>
          <Button 
            onClick={() => setShowUpgradeModal(true)}
            className="bg-primary hover:bg-primary/90"
          >
            Upgrade to Unlock
          </Button>
        </div>
      </BentoCard>
      
      <TeamMemberUpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
