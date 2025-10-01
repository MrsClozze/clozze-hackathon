import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TasksProvider } from "@/contexts/TasksContext";
import { ListingsProvider } from "@/contexts/ListingsContext";
import { BuyersProvider } from "@/contexts/BuyersContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Team from "./pages/Team";
import Listings from "./pages/Listings";
import Buyers from "./pages/Buyers";
import Contacts from "./pages/Contacts";
import Documents from "./pages/Documents";
import Tasks from "./pages/Tasks";
import Marketing from "./pages/Marketing";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import OAuthStart from "./pages/OAuthStart";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <UserProvider>
          <ListingsProvider>
            <BuyersProvider>
              <ContactsProvider>
                <TasksProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/team" element={<Team />} />
                        <Route path="/listings" element={<Listings />} />
                        <Route path="/buyers" element={<Buyers />} />
                        <Route path="/contacts" element={<Contacts />} />
                        <Route path="/documents" element={<Documents />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/marketing" element={<Marketing />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/pricing" element={<Pricing />} />
<Route path="/integrations" element={<Integrations />} />
                        <Route path="/oauth/start" element={<OAuthStart />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                  </TooltipProvider>
                </TasksProvider>
              </ContactsProvider>
            </BuyersProvider>
          </ListingsProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
