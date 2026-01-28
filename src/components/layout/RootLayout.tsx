import { Outlet } from 'react-router-dom';
import { UserpilotProvider } from '@/components/UserpilotProvider';

/**
 * Root layout component that wraps all routes
 * This is where we initialize route-dependent providers like Userpilot
 */
export function RootLayout() {
  return (
    <UserpilotProvider>
      <Outlet />
    </UserpilotProvider>
  );
}
