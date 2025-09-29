import Layout from "@/components/layout/Layout";
import StatsOverview from "@/components/dashboard/StatsOverview";
import ActiveListingsCard from "@/components/dashboard/ActiveListingsCard";
import ActiveBuyersCard from "@/components/dashboard/ActiveBuyersCard";
import CalendarWidget from "@/components/dashboard/CalendarWidget";
import UrgentTasksSidebar from "@/components/dashboard/UrgentTasksSidebar";
import DocumentUploadCard from "@/components/dashboard/DocumentUploadCard";

const Index = () => {
  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Page Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-text-heading mb-2">
            Dashboard
          </h1>
          <p className="text-text-muted">
            Welcome back! Here's an overview of your real estate activities.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="animate-slide-up">
          <StatsOverview />
        </div>

        {/* Main Dashboard Grid */}
        <div className="flex gap-8">
          {/* Left Column - Main Content */}
          <div className="flex-1 space-y-8">
            {/* Active Listings & Buyers */}
            <div className="grid grid-cols-1 gap-bento">
              <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <ActiveListingsCard />
              </div>
              <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <ActiveBuyersCard />
              </div>
            </div>

            {/* Calendar and Upload */}
            <div className="grid grid-cols-2 gap-bento">
              <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
                <CalendarWidget />
              </div>
              <div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
                <DocumentUploadCard />
              </div>
            </div>
          </div>

          {/* Right Column - Urgent Tasks */}
          <div className="animate-slide-up" style={{ animationDelay: "0.5s" }}>
            <UrgentTasksSidebar />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
