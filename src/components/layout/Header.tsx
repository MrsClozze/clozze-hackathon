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
        <button className="flex items-center gap-2 relative bg-black/20 backdrop-blur-md text-white hover:bg-black/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-purple-500/10 before:via-blue-500/10 before:to-cyan-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-12"></div>
          <Upload className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Upload File</span>
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