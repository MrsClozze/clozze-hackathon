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
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User>({
    name: "",
    title: "",
    initials: "",
    avatarUrl: ""
  });
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    // Wait for auth to finish loading before attempting to fetch profile
    if (authLoading) {
      return;
    }

    if (!authUser) {
      // Reset to empty when no user (avoid showing stale data)
      setUser({
        name: "",
        title: "",
        initials: "",
        avatarUrl: ""
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, professional_title, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || authUser.email?.split('@')[0] || 'User';
        const initials = firstName || lastName 
          ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
          : (authUser.email?.charAt(0) || 'U').toUpperCase();

        setUser({
          name: fullName,
          title: profile.professional_title || "Real Estate Agent",
          initials: initials,
          avatarUrl: profile.avatar_url || ""
        });
      } else {
        // No profile found, use email-based name
        const emailName = authUser.email?.split('@')[0] || 'User';
        setUser({
          name: emailName,
          title: "Real Estate Agent",
          initials: emailName.charAt(0).toUpperCase(),
          avatarUrl: ""
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [authUser, authLoading]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUserProfile }}>
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
