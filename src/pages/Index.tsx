import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import Layout from "@/components/layout/Layout";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import ActiveListingsCard from "@/components/dashboard/ActiveListingsCard";
import ActiveBuyersCard from "@/components/dashboard/ActiveBuyersCard";
import CalendarView from "@/components/dashboard/CalendarView";
import TasksSidebar from "@/components/dashboard/TasksSidebar";
import OnboardingWalkthrough from "@/components/onboarding/OnboardingWalkthrough";
import { useUser } from "@/contexts/UserContext";

const Index = () => {
  const { user, refreshUser } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding only if user hasn't completed it
    if (!user.onboardingCompleted && user.name !== "Loading...") {
      setShowOnboarding(true);
    }
  }, [user.onboardingCompleted, user.name]);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await refreshUser();
  };

  return (
    <Layout>
      {showOnboarding && <OnboardingWalkthrough onComplete={handleOnboardingComplete} />}
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

          {/* Right Column - Tasks Sidebar */}
          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <TasksSidebar />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
