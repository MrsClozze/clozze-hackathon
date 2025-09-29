import { Sun, Upload, Bell, ChevronDown } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-end px-6 z-50">

      {/* Right Side - Controls */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button className="p-2 hover:bg-card rounded-lg transition-colors">
          <Sun className="h-5 w-5 text-text-muted" />
        </button>

        {/* Upload File Button */}
        <button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Upload className="h-4 w-4" />
          Upload File
        </button>

        {/* Notifications */}
        <button className="p-2 hover:bg-card rounded-lg transition-colors relative">
          <Bell className="h-5 w-5 text-text-muted" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 hover:bg-card px-3 py-2 rounded-lg transition-colors cursor-pointer">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-foreground">J</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-heading">John Doe</p>
            <p className="text-xs text-text-muted">Trial</p>
          </div>
          <ChevronDown className="h-4 w-4 text-text-muted" />
        </div>
      </div>
    </header>
  );
}