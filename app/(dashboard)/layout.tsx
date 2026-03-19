import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/sidebar';
import { NotificationCentre } from '@/components/notification-centre';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          {/* Mobile: notification bell in top right */}
          <div className="lg:hidden fixed top-0 right-0 z-40 flex items-center gap-2 px-4 h-14">
            <NotificationCentre />
          </div>
          {/* Desktop: notification bell fixed top right */}
          <div className="hidden lg:flex fixed top-3 right-6 z-40 items-center gap-2">
            <NotificationCentre />
          </div>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}