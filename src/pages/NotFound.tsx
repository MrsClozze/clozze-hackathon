import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-text-heading">404</h1>
        <p className="text-2xl text-text-muted">Oops! Page not found</p>
        <p className="text-text-muted">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/auth">
            <Button variant="default" className="mt-4">
              <Home className="w-4 h-4 mr-2" />
              Go to Login
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
