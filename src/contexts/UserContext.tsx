import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface User {
  name: string;
  title: string;
  initials: string;
  avatarUrl?: string;
}

interface UserContextType {
  user: User;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User>({
    name: "Guy Hawkins",
    title: "Real Estate Agent",
    initials: "GH",
    avatarUrl: ""
  });

  const fetchUserProfile = async () => {
    if (!authUser) {
      // Reset to default when no user
      setUser({
        name: "Guy Hawkins",
        title: "Real Estate Agent",
        initials: "GH",
        avatarUrl: ""
      });
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name, avatar_url')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (profile) {
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || authUser.email?.split('@')[0] || 'User';
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

        setUser({
          name: fullName,
          title: profile.company_name || "Real Estate Agent",
          initials: initials,
          avatarUrl: profile.avatar_url || ""
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to email-based name
      const emailName = authUser.email?.split('@')[0] || 'User';
      setUser({
        name: emailName,
        title: "Real Estate Agent",
        initials: emailName.charAt(0).toUpperCase(),
        avatarUrl: ""
      });
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [authUser]);

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
