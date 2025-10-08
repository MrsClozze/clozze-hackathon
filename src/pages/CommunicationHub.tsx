import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import AICommunicationHub from "@/components/dashboard/AICommunicationHub";
import AIToneOnboarding from "@/components/dashboard/AIToneOnboarding";
import HelpfulLinksWidget from "@/components/dashboard/HelpfulLinksWidget";
import CommunicationHubOnboardingModal from "@/components/dashboard/CommunicationHubOnboardingModal";
import CommunicationHubTourSlideshow from "@/components/dashboard/CommunicationHubTourSlideshow";
import { supabase } from "@/integrations/supabase/client";

const CommunicationHub = () => {
  const [showWidget, setShowWidget] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
    
    // Check if user has seen the communication hub tour
    const hasSeenTour = localStorage.getItem('hasSeenCommHubTour');
    if (!hasSeenTour) {
      setShowOnboarding(true);
    }
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

  const handleStartTour = () => {
    setShowOnboarding(false);
    setShowTour(true);
  };

  const handleSkipTour = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenCommHubTour', 'true');
  };

  const handleCloseTour = () => {
    setShowTour(false);
    localStorage.setItem('hasSeenCommHubTour', 'true');
  };

  return (
    <Layout>
      <CommunicationHubOnboardingModal
        isOpen={showOnboarding}
        onStartTour={handleStartTour}
        onSkip={handleSkipTour}
      />
      
      <CommunicationHubTourSlideshow
        isOpen={showTour}
        onClose={handleCloseTour}
      />

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-heading mb-2">Communication Hub</h1>
          <p className="text-text-muted">
            AI-analyzed messages from your connected email and text platforms
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <AIToneOnboarding onComplete={handleOnboardingComplete} />
          {showWidget && <HelpfulLinksWidget />}
          <AICommunicationHub limit={3} />
        </div>
      </div>
    </Layout>
  );
};

export default CommunicationHub;
