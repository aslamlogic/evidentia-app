'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Scale, LayoutDashboard, FolderOpen, FileText, Brain,
  FileOutput, ClipboardList, Users, LogOut, ChevronLeft,
  ChevronRight, Menu, X, Zap,
} from 'lucide-react';
import { TIER_FEATURES } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/matters', label: 'Matters', icon: FolderOpen },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/tasks', label: 'Analysis', icon: Brain },
  { href: '/outputs', label: 'Outputs', icon: FileOutput },
  { href: '/intakes', label: 'Intakes', icon: ClipboardList },
];

const adminItems = [
  { href: '/admin', label: 'Admin', icon: Users },
];

const TIER_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  Basic: { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'text-slate-500' },
  Silver: { bg: 'bg-slate-200', text: 'text-slate-800', icon: 'text-slate-600' },
  Gold: { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'text-amber-600' },
  Platinum: { bg: 'bg-purple-100', text: 'text-purple-800', icon: 'text-purple-600' },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const tier = user?.subscriptionTier ?? 'Basic';
  const tierStyle = TIER_STYLES[tier] ?? TIER_STYLES.Basic;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border/40">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Scale className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight leading-none">Evidentia</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5">Legal Reasoning</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {(user?.role === 'admin' || user?.role === 'superuser') && (
          <>
            <div className="h-px bg-border/40 my-3 mx-2" />
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Admin</p>
            )}
            {adminItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Tier indicator */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className={cn('rounded-lg px-3 py-2.5 flex items-center gap-2.5', tierStyle.bg)}>
            <Zap className={cn('w-4 h-4', tierStyle.icon)} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-semibold', tierStyle.text)}>{tier} Plan</p>
              <p className="text-[10px] text-muted-foreground">{TIER_FEATURES[tier]?.tasks?.length ?? 0} task types</p>
            </div>
          </div>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-border/40 p-3">
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate leading-tight">{user?.firstName ?? ''} {user?.lastName ?? ''}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email ?? ''}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-md border"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        'lg:hidden fixed left-0 top-0 h-full w-72 bg-card z-50 shadow-xl transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <div className={cn(
        'hidden lg:flex flex-col h-screen bg-card border-r border-border/40 transition-all duration-200 flex-shrink-0 relative',
        collapsed ? 'w-[68px]' : 'w-60'
      )}>
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted z-10 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>
    </>
  );
}
