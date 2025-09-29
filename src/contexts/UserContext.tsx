import { createContext, useContext, ReactNode } from "react";

interface User {
  name: string;
  title: string;
  initials: string;
}

interface UserContextType {
  user: User;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // This will be replaced with actual auth data when authentication is implemented
  const user: User = {
    name: "Guy Hawkins",
    title: "Real Estate Agent",
    initials: "GH"
  };

  return (
    <UserContext.Provider value={{ user }}>
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
