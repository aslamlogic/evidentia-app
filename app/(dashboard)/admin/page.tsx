'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Loader2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'superuser') {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [currentUser, router, fetchUsers]);

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await usersApi.update(userId, { role } as Partial<User>);
      toast.success('Role updated');
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally { setUpdating(null); }
  };

  const handleTierChange = async (userId: string, tier: string) => {
    setUpdating(userId);
    try {
      await usersApi.update(userId, { subscriptionTier: tier } as Partial<User>);
      toast.success('Tier updated');
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally { setUpdating(null); }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': case 'superuser': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'user_admin': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'tier-platinum';
      case 'Gold': return 'tier-gold';
      case 'Silver': return 'tier-silver';
      default: return 'tier-basic';
    }
  };

  const displayRole = (role: string) => role === 'superuser' ? 'admin' : role;

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'superuser') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Administration</h1>
        <p className="page-subtitle">Manage users and organization settings</p>
      </div>

      <div className="card-elevated">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="section-title !mb-0">Users</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{users?.length ?? 0} registered users</p>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u?.id} className="card-flat flex items-center gap-4 p-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xs">
                    {(u?.firstName?.[0] ?? '')}{(u?.lastName?.[0] ?? '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u?.firstName ?? ''} {u?.lastName ?? ''}</p>
                    <p className="text-xs text-muted-foreground">{u?.email ?? ''}</p>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize', getRoleBadgeClass(u?.role ?? 'user'))}>
                    <Shield className="w-3 h-3" />{displayRole(u?.role ?? 'user')}
                  </span>
                  <span className={cn('status-badge', getTierBadgeClass(u?.subscriptionTier ?? 'Basic'))}>
                    {u?.subscriptionTier ?? 'Basic'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={displayRole(u?.role ?? 'user')} onValueChange={v => handleRoleChange(u?.id ?? '', v)} disabled={updating === u?.id || u?.role === 'superuser'}>
                      <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="user_admin">User Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={u?.subscriptionTier ?? 'Basic'} onValueChange={v => handleTierChange(u?.id ?? '', v)} disabled={updating === u?.id || u?.role === 'superuser'}>
                      <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Basic">Basic</SelectItem>
                        <SelectItem value="Silver">Silver</SelectItem>
                        <SelectItem value="Gold">Gold</SelectItem>
                        <SelectItem value="Platinum">Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                    {updating === u?.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
