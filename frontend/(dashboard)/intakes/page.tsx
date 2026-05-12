'use client';

import { useEffect, useState, useCallback } from 'react';
import { intakesApi, mattersApi } from '@/lib/api';
import type { IntakeForm, Matter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addNotification } from '@/components/notification-centre';
import { Plus, ClipboardList, Lock, Unlock, Loader2, Eye, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IntakesPage() {
  const [intakes, setIntakes] = useState<IntakeForm[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewIntake, setViewIntake] = useState<IntakeForm | null>(null);
  const [form, setForm] = useState({ title: '', matterId: '' });
  const [locking, setLocking] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [i, m] = await Promise.allSettled([intakesApi.list(), mattersApi.list()]);
      setIntakes(i.status === 'fulfilled' ? (Array.isArray(i.value) ? i.value : []) : []);
      setMatters(m.status === 'fulfilled' ? (Array.isArray(m.value) ? m.value : []) : []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.title.trim()) { addNotification('Title is required', 'error'); return; }
    setCreating(true);
    try {
      await intakesApi.create({ title: form.title, matterId: form.matterId || undefined } as Partial<IntakeForm>);
      addNotification('Intake form created', 'success');
      setShowCreate(false);
      setForm({ title: '', matterId: '' });
      fetchData();
    } catch (err: unknown) {
      addNotification(err instanceof Error ? err.message : 'Failed to create', 'error');
    } finally { setCreating(false); }
  };

  const handleLock = async (id: string) => {
    setLocking(id);
    try {
      await intakesApi.lock(id);
      addNotification('Intake locked successfully', 'success');
      fetchData();
    } catch (err: unknown) {
      addNotification(err instanceof Error ? err.message : 'Lock failed', 'error');
    } finally { setLocking(null); }
  };

  const handleUnlock = async (id: string) => {
    setLocking(id);
    try {
      await intakesApi.unlock(id);
      addNotification('Intake unlocked', 'success');
      fetchData();
    } catch (err: unknown) {
      addNotification(err instanceof Error ? err.message : 'Unlock failed', 'error');
    } finally { setLocking(null); }
  };

  const handleView = async (id: string) => {
    try {
      const data = await intakesApi.get(id);
      setViewIntake(data);
    } catch (err: unknown) {
      addNotification(err instanceof Error ? err.message : 'Failed to load', 'error');
    }
  };

  const getMatterName = (matterId?: string) => {
    if (!matterId) return null;
    const m = matters.find(m => m?.id === matterId);
    return m?.title ?? null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Intake Forms</h1>
          <p className="page-subtitle">Create and manage client intake forms</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> New Intake
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (intakes?.length ?? 0) === 0 ? (
        <div className="card-elevated py-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No intake forms yet</p>
          <Button onClick={() => setShowCreate(true)} variant="outline" size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-1" /> Create Intake
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {intakes.map((intake) => {
            const matterName = getMatterName(intake?.matterId);
            return (
              <div key={intake?.id} className="card-interactive flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  {intake?.locked ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Unlock className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{intake?.title ?? 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {matterName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderOpen className="w-3 h-3" />{matterName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(intake?.createdAt ?? 0).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className={cn('status-badge', intake?.locked ? 'status-succeeded' : 'status-open')}>
                  {intake?.locked ? 'Locked' : 'Open'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleView(intake?.id ?? '')} className="h-8 w-8">
                  <Eye className="w-4 h-4" />
                </Button>
                {!intake?.locked ? (
                  <Button variant="outline" size="icon" onClick={() => handleLock(intake?.id ?? '')} disabled={locking === intake?.id} className="h-8 w-8" title="Lock intake">
                    {locking === intake?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" onClick={() => handleUnlock(intake?.id ?? '')} disabled={locking === intake?.id} className="h-8 w-8 border-amber-200 text-amber-600 hover:bg-amber-50" title="Unlock intake">
                    {locking === intake?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Create Intake Form</DialogTitle>
            <DialogDescription>Set up a new client intake form</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="Intake form title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Matter (optional)</Label>
              <Select value={form.matterId} onValueChange={v => setForm({...form, matterId: v})}>
                <SelectTrigger><SelectValue placeholder="Link to matter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(matters ?? []).map(m => <SelectItem key={m?.id} value={m?.id ?? ''}>{m?.title ?? 'Untitled'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewIntake} onOpenChange={() => setViewIntake(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{viewIntake?.title ?? 'Intake Form'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2">
              <span className={cn('status-badge', viewIntake?.locked ? 'status-succeeded' : 'status-open')}>
                {viewIntake?.locked ? 'Locked' : 'Open'}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(viewIntake?.createdAt ?? 0).toLocaleDateString()}</span>
            </div>
            {(viewIntake?.fields?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {(viewIntake?.fields ?? []).map((field, idx) => (
                  <div key={idx} className="space-y-1">
                    <Label className="text-sm">{field?.label ?? field?.name ?? 'Field'} {field?.required && <span className="text-destructive">*</span>}</Label>
                    <p className="text-sm bg-muted/50 rounded p-2">{viewIntake?.responses?.[field?.name ?? ''] ?? 'No response'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No fields configured for this intake form.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
