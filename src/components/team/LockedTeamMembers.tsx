import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import BentoCard from "@/components/dashboard/BentoCard";
import TeamMemberUpgradeModal from "./TeamMemberUpgradeModal";

export default function LockedTeamMembers() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <>
      <BentoCard title="Team Profiles" subtitle="Upgrade to access your team's profiles">
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-text-heading mb-3">
            Team Profiles
          </h3>
          <p className="text-text-muted mb-6 max-w-md">
            Upgrade to access your team's profiles and view detailed information about each team member.
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
