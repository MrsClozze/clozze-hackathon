import Layout from "@/components/layout/Layout";
import AICommunicationHub from "@/components/dashboard/AICommunicationHub";

const CommunicationHub = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-heading mb-2">Communication Hub</h1>
          <p className="text-text-muted">
            AI-analyzed messages from your connected email and text platforms
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <AICommunicationHub />
        </div>
      </div>
    </Layout>
  );
};

export default CommunicationHub;
