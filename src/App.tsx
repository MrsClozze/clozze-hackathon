import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TasksProvider } from "@/contexts/TasksContext";
import { ListingsProvider } from "@/contexts/ListingsContext";
import { BuyersProvider } from "@/contexts/BuyersContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { ThemeProvider } from "@/components/theme-provider";
import ResetPassword from "./pages/ResetPassword";
import Index from "./pages/Index";
import Team from "./pages/Team";
import Listings from "./pages/Listings";
import Buyers from "./pages/Buyers";
import Contacts from "./pages/Contacts";
import Documents from "./pages/Documents";
import Tasks from "./pages/Tasks";
import CommunicationHub from "./pages/CommunicationHub";
import Marketing from "./pages/Marketing";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/team", element: <Team /> },
  { path: "/listings", element: <Listings /> },
  { path: "/buyers", element: <Buyers /> },
  { path: "/contacts", element: <Contacts /> },
  { path: "/documents", element: <Documents /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/communication-hub", element: <CommunicationHub /> },
  { path: "/marketing", element: <Marketing /> },
  { path: "/auth", element: <Auth /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/pricing", element: <Pricing /> },
  { path: "/integrations", element: <Integrations /> },
  { path: "/settings", element: <Settings /> },
  { path: "*", element: <NotFound /> },
]);

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
<RouterProvider
  router={router}
  future={{ v7_startTransition: true }}
/>
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
