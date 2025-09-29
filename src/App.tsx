import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Team from "./pages/Team";
import Listings from "./pages/Listings";
import Buyers from "./pages/Buyers";
import Contacts from "./pages/Contacts";
import Documents from "./pages/Documents";
import Tasks from "./pages/Tasks";
import Marketing from "./pages/Marketing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <UserProvider>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
