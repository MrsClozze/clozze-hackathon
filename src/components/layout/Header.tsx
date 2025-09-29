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
        <button className="flex items-center gap-2 relative bg-gradient-to-r from-purple-600/30 via-pink-500/30 to-cyan-400/30 backdrop-blur-md text-white hover:from-purple-500/50 hover:via-pink-400/50 hover:to-cyan-300/50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border-2 border-transparent hover:border-white/50 shadow-2xl hover:shadow-purple-500/25 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/20 before:via-fuchsia-500/20 before:to-cyan-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 overflow-hidden group animate-pulse hover:animate-none">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-cyan-400/30 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-500 skew-x-12"></div>
          <div className="absolute inset-0 bg-gradient-to-45 from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-lg opacity-20 group-hover:opacity-40 blur-sm transition-opacity duration-300"></div>
          <Upload className="h-4 w-4 relative z-10 drop-shadow-lg" />
          <span className="relative z-10 font-bold text-shadow-lg">Upload File</span>
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