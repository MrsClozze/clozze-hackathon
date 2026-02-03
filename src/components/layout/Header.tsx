import { useState } from "react";
import { Sun, Moon, Upload, Bell, ChevronDown, CreditCard, Settings } from "lucide-react";
import UploadFileModal from "@/components/dashboard/UploadFileModal";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  const { user, loading: userLoading } = useUser();
  const { user: authUser, subscription, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // User is on trial only if status is 'trial' AND they're not a team_member (team members are fully subscribed)
  const isTrialAccount = subscription?.status === 'trial' && subscription?.plan_type !== 'team_member';
  
  // Show loading or actual name (never show empty)
  const displayName = userLoading 
    ? 'Loading...'
    : user.name || authUser?.email?.split('@')[0] || 'User';
  const displayTitle = userLoading ? '' : user.title || 'Real Estate Agent';
  const displayInitials = userLoading ? '' : user.initials || displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 z-50">
      <UploadFileModal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen} />

      {/* Left Side - Empty or Logo Space */}
      <div className="flex items-center">
        {/* Reserved for logo or branding */}
      </div>

      {/* Right Side - Controls */}
      <div className="flex items-center gap-3">
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

        {/* Upload File Button */}
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 relative bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <Upload className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Upload File</span>
        </button>

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

        {/* Notifications - Next to Theme Toggle */}
        <button className="p-2 hover:bg-card rounded-lg transition-colors relative">
          <Bell className="h-5 w-5 text-text-muted" />
        </button>

        {/* User Menu Dropdown or Sign In */}
        {authUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:bg-card px-3 py-2 rounded-lg transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-text-heading text-left">
                    {displayName}
                  </p>
                  <p className="text-xs text-text-muted text-left">{displayTitle}</p>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-sm font-semibold">{displayInitials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-text-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border border-border">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/pricing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscription
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
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
