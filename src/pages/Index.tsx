import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import Layout from "@/components/layout/Layout";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import ActiveListingsCard from "@/components/dashboard/ActiveListingsCard";
import ActiveBuyersCard from "@/components/dashboard/ActiveBuyersCard";
import CalendarView from "@/components/dashboard/CalendarView";
import TasksSidebar from "@/components/dashboard/TasksSidebar";
import AICommunicationHub from "@/components/dashboard/AICommunicationHub";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import ProductTour from "@/components/dashboard/ProductTour";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Index = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (!data.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const handleStartTour = () => {
    setShowOnboarding(false);
    setShowTour(true);
  };

  const handleSkipOnboarding = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      setShowOnboarding(false);
      toast.success("Welcome to Clozze!");
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      toast.error("Failed to save preference");
    }
  };

  const handleCompleteTour = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      setShowTour(false);
      toast.success("Tour completed! Welcome to Clozze!");
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      toast.error("Failed to save progress");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <OnboardingModal 
        isOpen={showOnboarding}
        onStartTour={handleStartTour}
        onSkip={handleSkipOnboarding}
      />
      
      <ProductTour 
        isOpen={showTour}
        onComplete={handleCompleteTour}
      />

      <div className="p-8">
        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Main Dashboard Grid */}
        <div className="flex gap-8">
          {/* Left Column - Main Content */}
          <div className="flex-1 space-y-8">
            {/* Listings Section */}
            <div className="animate-slide-up">
              <ActiveListingsCard />
            </div>

            {/* Buyers Section */}
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <ActiveBuyersCard />
            </div>

            {/* Calendar Section */}
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CalendarView />
            </div>
          </div>

          {/* Right Column - To-Do List and AI Communication Hub */}
          <div className="w-80 flex-shrink-0 space-y-6">
            {/* To-Do List */}
            <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <TasksSidebar />
            </div>

            {/* AI Communication Hub */}
            <div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <AICommunicationHub limit={3} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
