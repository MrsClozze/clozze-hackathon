import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import AICommunicationHub from "@/components/dashboard/AICommunicationHub";
import AIToneOnboarding from "@/components/dashboard/AIToneOnboarding";
import HelpfulLinksWidget from "@/components/dashboard/HelpfulLinksWidget";
import { supabase } from "@/integrations/supabase/client";

const CommunicationHub = () => {
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('agent_communication_preferences')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single();

    if (data?.onboarding_completed) {
      setShowWidget(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowWidget(true);
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-heading mb-2">Communication Hub</h1>
          <p className="text-text-muted">
            AI-analyzed messages from your connected email and text platforms
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          <AIToneOnboarding onComplete={handleOnboardingComplete} />
          {showWidget && <HelpfulLinksWidget />}
          <AICommunicationHub showTabs={true} />
        </div>
      </div>
    </Layout>
  );
};

export default CommunicationHub;
