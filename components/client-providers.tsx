'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/lib/auth-store';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
    setMounted(true);
  }, [loadFromStorage]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  );
}
