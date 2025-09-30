import { useState } from "react";
import { Sun, Moon, Upload, Bell, ChevronDown, CreditCard } from "lucide-react";
import UploadFileModal from "@/components/dashboard/UploadFileModal";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user } = useUser();
  const { user: authUser, subscription, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const isTrialAccount = subscription?.status === 'trial';
  const displayName = authUser 
    ? `${user.name}${isTrialAccount ? ' (Trial Account)' : ''}`
    : user.name;

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 z-50">
      <UploadFileModal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen} />

      {/* Left Side - User Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-primary-foreground">{user.initials}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-text-heading">{displayName}</p>
          <p className="text-xs text-text-muted">{user.title}</p>
        </div>
        {isTrialAccount && (
          <Badge variant="secondary">Trial</Badge>
        )}
      </div>

      {/* Right Side - Controls */}
      <div className="flex items-center gap-4">
        {isTrialAccount && (
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/pricing')}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        )}

        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 hover:bg-card rounded-lg transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-text-muted" />
          ) : (
            <Moon className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {/* Upload File Button */}
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <Upload className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Upload File</span>
        </button>

        {/* Notifications */}
        <button className="p-2 hover:bg-card rounded-lg transition-colors relative">
          <Bell className="h-5 w-5 text-text-muted" />
        </button>

        {/* User Menu */}
        {authUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-card px-3 py-2 rounded-lg transition-colors">
                <ChevronDown className="h-4 w-4 text-text-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/pricing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscription
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/integrations')}>
                <Upload className="mr-2 h-4 w-4" />
                Integrations
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => navigate('/auth')} size="sm">
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
