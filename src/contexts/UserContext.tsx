import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface User {
  name: string;
  title: string;
  initials: string;
  onboardingCompleted: boolean;
}

interface UserContextType {
  user: User;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User>({
    name: "Loading...",
    title: "Real Estate Agent",
    initials: "...",
    onboardingCompleted: false
  });

  const fetchUserProfile = async () => {
    if (!authUser) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, onboarding_completed')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'User';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

        setUser({
          name: fullName,
          title: "Real Estate Agent",
          initials,
          onboardingCompleted: profile.onboarding_completed ?? false
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && authUser) {
      fetchUserProfile();
    }
  }, [authUser, authLoading]);

  return (
    <UserContext.Provider value={{ user, refreshUser: fetchUserProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
