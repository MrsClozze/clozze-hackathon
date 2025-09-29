import { Upload } from "lucide-react";
import Layout from "@/components/layout/Layout";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import ActiveListingsCard from "@/components/dashboard/ActiveListingsCard";
import ActiveBuyersCard from "@/components/dashboard/ActiveBuyersCard";
import CalendarView from "@/components/dashboard/CalendarView";
import TasksSidebar from "@/components/dashboard/TasksSidebar";

const Index = () => {
  return (
    <Layout>
      <div className="p-8">
        {/* Profile Header Section */}
        <div className="flex items-center justify-between mb-8 p-6 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-gold rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-accent-gold-foreground">U</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-heading">Guy Hawkins</h1>
              <p className="text-sm text-text-muted">Real Estate Agent</p>
            </div>
          </div>
          
          <button className="flex items-center gap-2 backdrop-blur-3xl bg-white/20 border border-white/30 text-text-heading hover:bg-white/30 hover:border-white/40 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 shadow-2xl hover:shadow-white/10 ring-1 ring-white/20 hover:ring-white/30 backdrop-saturate-200">
            <Upload className="h-4 w-4" />
            Upload File
          </button>
        </div>

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
