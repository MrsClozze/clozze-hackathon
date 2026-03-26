import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountState } from "@/contexts/AccountStateContext";
import Layout from "@/components/layout/Layout";
import ActiveListingsCard from "@/components/dashboard/ActiveListingsCard";
import ActiveBuyersCard from "@/components/dashboard/ActiveBuyersCard";
import CalendarView from "@/components/dashboard/CalendarView";
import TasksSidebar from "@/components/dashboard/TasksSidebar";
import AICommunicationHub from "@/components/dashboard/AICommunicationHub";
import { Info, Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { isDemo, isLoading: accountStateLoading } = useAccountState();

  useEffect(() => {
    document.title = "Home | Clozze";
  }, []);

  // Show loading state while checking auth or account state
  if (authLoading || accountStateLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect unauthenticated users to sign-in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return (
    <Layout>
      <div className="p-8">
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="mb-8 p-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-accent-gold" />
            </div>
            <div>
              <h3 className="font-semibold text-text-heading mb-1">Welcome to Clozze!</h3>
              <p className="text-sm text-text-muted">
                You're in <strong className="text-accent-gold">Demo Mode</strong>. The sample data below shows you how Clozze works. 
                Add your first real listing or buyer to switch to Live Mode and start managing your transactions!
              </p>
            </div>
          </div>
        )}

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
