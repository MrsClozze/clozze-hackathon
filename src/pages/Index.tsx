import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import ActiveListingsCard from "@/components/dashboard/ActiveListingsCard";
import ActiveBuyersCard from "@/components/dashboard/ActiveBuyersCard";
import CalendarView from "@/components/dashboard/CalendarView";
import TasksSidebar from "@/components/dashboard/TasksSidebar";
import AICommunicationHub from "@/components/dashboard/AICommunicationHub";

const Index = () => {
  useEffect(() => {
    document.title = "Home | Clozze";
  }, []);
  return (
    <Layout>
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
