import { NavLink, useNavigate } from "react-router-dom";
import { 
  Home, 
  Users, 
  Building, 
  UserCheck, 
  Contact, 
  FileText, 
  CheckSquare,
  MessageSquare, 
  Plug 
} from "lucide-react";
import clozzeLogo from "@/assets/clozze-logo.png";
import clozzeLogoBlack from "@/assets/clozze-logo-black.png";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "next-themes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const navigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Team", href: "/team", icon: Users },
  { name: "Listings", href: "/listings", icon: Building },
  { name: "Buyers", href: "/buyers", icon: UserCheck },
  { name: "Contacts", href: "/contacts", icon: Contact },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Tasks & To Do", href: "/tasks", icon: CheckSquare },
  { name: "Communication Hub", href: "/communication-hub", icon: MessageSquare },
  { name: "Integrations", href: "/integrations", icon: Plug },
];

export default function Sidebar() {
  const { user, loading } = useUser();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-nav-background border-r border-border z-40">
      {/* Logo Section */}
      <div className="p-6 border-b border-border flex justify-center">
        <button 
          onClick={() => navigate('/')}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Go to home"
        >
          <img 
            src={theme === 'light' ? clozzeLogoBlack : clozzeLogo}
            alt="Clozze" 
            className="w-48 h-auto"
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full ${
                isActive
                  ? "bg-nav-item-active text-accent-gold-foreground shadow-md"
                  : "text-text-body hover:bg-nav-item-hover hover:text-text-heading"
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>


      {/* User Profile Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-card-elevated transition-colors">
          {loading ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 min-w-0 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </>
          ) : (
            <>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} alt={user.name || 'User'} />
                <AvatarFallback className="text-sm font-semibold">
                  {user.initials || user.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-heading truncate">
                  {user.name || 'Loading...'}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {user.title || 'Real Estate Agent'}
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Credit Usage */}
        <div className="mt-3 px-3">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>600/1200 credits used</span>
          </div>
          <div className="w-full bg-background-elevated rounded-full h-1">
            <div className="bg-accent-gold h-1 rounded-full" style={{ width: '50%' }}></div>
          </div>
        </div>
      </div>
    </aside>
  );
}