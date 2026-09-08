import { AppHeader, RequireAuth } from '@/components/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppHeader />
      {children}
    </RequireAuth>
  );
}
