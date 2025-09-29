import { NavLink } from "react-router-dom";
import { 
  Home, 
  Users, 
  Building, 
  UserCheck, 
  Contact, 
  FileText, 
  CheckSquare, 
  Megaphone 
} from "lucide-react";
import clozzeLogo from "@/assets/clozze-logo.png";

const navigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Team", href: "/team", icon: Users },
  { name: "Listings", href: "/listings", icon: Building },
  { name: "Buyers", href: "/buyers", icon: UserCheck },
  { name: "Contacts", href: "/contacts", icon: Contact },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Tasks & To Do", href: "/tasks", icon: CheckSquare },
  { name: "Marketing", href: "/marketing", icon: Megaphone },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-nav-background border-r border-border z-40">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <img 
          src={clozzeLogo} 
          alt="Clozze" 
          className="h-8 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-nav-item-active text-accent-gold-foreground shadow-md"
                  : "text-text-body hover:bg-nav-item-hover hover:text-text-heading"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-card-elevated transition-colors">
          <div className="w-8 h-8 bg-accent-gold rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-accent-gold-foreground">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-heading truncate">John Doe</p>
            <p className="text-xs text-text-muted truncate">Senior Agent</p>
          </div>
        </div>
      </div>
    </aside>
  );
}