'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mattersApi, documentsApi, tasksApi } from '@/lib/api';
import type { Matter, Document as DocType, AITask } from '@/lib/types';
import { MATTER_TYPE_LABELS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, FolderOpen, Calendar, User, Loader2, ArrowUpDown, FileText, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MattersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [allDocs, setAllDocs] = useState<DocType[]>([]);
  const [allTasks, setAllTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'civil' as Matter['type'], clientName: '', clientEmail: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d, t] = await Promise.allSettled([mattersApi.list(), documentsApi.list(), tasksApi.list()]);
      setMatters(m.status === 'fulfilled' ? (Array.isArray(m.value) ? m.value : []) : []);
      setAllDocs(d.status === 'fulfilled' ? (Array.isArray(d.value) ? d.value : []) : []);
      setAllTasks(t.status === 'fulfilled' ? (Array.isArray(t.value) ? t.value : []) : []);
    } catch { setMatters([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (searchParams?.get('new') === 'true') setShowCreate(true); }, [searchParams]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setCreating(true);
    try {
      const created = await mattersApi.create(form);
      toast.success('Matter created');
      setShowCreate(false);
      setForm({ title: '', description: '', type: 'civil' as Matter['type'], clientName: '', clientEmail: '' });
      router.push(`/matters/${created?.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create matter');
    } finally { setCreating(false); }
  };

  const filtered = (matters ?? []).filter(m => {
    if (search && !(m?.title ?? '').toLowerCase().includes(search.toLowerCase()) && !(m?.clientName ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && m?.type !== filterType) return false;
    if (filterStatus !== 'all' && m?.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'title') return (a?.title ?? '').localeCompare(b?.title ?? '');
    return new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime();
  });

  const getDocCount = (matterId: string) => allDocs.filter(d => d.matterId === matterId).length;
  const getTaskCount = (matterId: string) => allTasks.filter(t => t.matterId === matterId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Matters</h1>
          <p className="page-subtitle">Manage your legal cases and matters</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 h-9"><Plus className="w-4 h-4" /> New Matter</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by title or client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(MATTER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSortBy(s => s === 'date' ? 'title' : 'date')} title={`Sort by ${sortBy === 'date' ? 'title' : 'date'}`}>
          <ArrowUpDown className="w-4 h-4" />
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated py-16 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground mb-4">No matters found</p>
          <Button onClick={() => setShowCreate(true)} variant="outline"><Plus className="w-4 h-4 mr-1" /> Create Matter</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const docCount = getDocCount(m?.id ?? '');
            const taskCount = getTaskCount(m?.id ?? '');
            return (
              <div
                key={m?.id}
                className="card-interactive px-5 py-4"
                onClick={() => router.push(`/matters/${m?.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold truncate">{m?.title ?? 'Untitled'}</h3>
                      <Badge variant="outline" className="text-[10px] font-medium">{MATTER_TYPE_LABELS[m?.type ?? ''] ?? m?.type}</Badge>
                      <Badge variant="outline" className={cn('text-[10px] border', `status-${m?.status ?? 'open'}`)}>{m?.status ?? 'open'}</Badge>
                    </div>
                    {m?.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{m.description}</p>}
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      {m?.clientName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {m.clientName}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(m?.createdAt ?? 0).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {docCount} doc{docCount !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> {taskCount} task{taskCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Matter</DialogTitle>
            <DialogDescription>Set up a new legal matter for AI analysis</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="e.g. Smith vs. Johnson Ltd" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v as Matter['type']})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MATTER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Brief description of the matter..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Client Name</Label><Input placeholder="Client name" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Client Email</Label><Input type="email" placeholder="client@email.com" value={form.clientEmail} onChange={e => setForm({...form, clientEmail: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>{creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}{creating ? 'Creating...' : 'Create Matter'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
