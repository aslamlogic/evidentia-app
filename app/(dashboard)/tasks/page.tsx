'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { tasksApi, mattersApi, documentsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { AITask, Matter, Document } from '@/lib/types';
import { TASK_TYPE_LABELS, TASK_TYPE_DESCRIPTIONS, TIER_FEATURES, isTaskAvailableForTier } from '@/lib/types';
import type { TaskType } from '@/lib/types';

const TIER_TASK_GROUPS = {
  'Basic (Tier 1)': ['scoping_analysis', 'laws_affected', 'case_summary'] as TaskType[],
  'Silver (Tier 2)': ['chronology', 'issues_list', 'cause_of_action_matrix', 'breaches_map', 'evidence_schedule'] as TaskType[],
  'Gold (Tier 3)': ['drafting_pack', 'defenses_prosecution'] as TaskType[],
  'Platinum (Tier 4)': ['lawyer_case_pack', 'adversarial_analysis', 'stress_test'] as TaskType[],
};

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Brain, Plus, CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, Lock, Play, FolderOpen } from 'lucide-react';

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'case_summary' as string, matterId: '', instructions: '', additionalFacts: '', documentIds: [] as string[] });

  const tier = user?.subscriptionTier ?? 'Basic';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.allSettled([tasksApi.list(), mattersApi.list()]);
      setTasks(t.status === 'fulfilled' ? (Array.isArray(t.value) ? t.value : []) : []);
      setMatters(m.status === 'fulfilled' ? (Array.isArray(m.value) ? m.value : []) : []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (searchParams?.get('new') === 'true') setShowCreate(true);
    const mId = searchParams?.get('matterId');
    if (mId) setForm(f => ({ ...f, matterId: mId }));
  }, [searchParams]);

  useEffect(() => {
    if (!form.matterId) { setDocuments([]); return; }
    documentsApi.list(form.matterId).then(d => setDocuments(Array.isArray(d) ? d : [])).catch(() => setDocuments([]));
  }, [form.matterId]);

  const handleCreate = async () => {
    if (!form.matterId) { toast.error('Select a matter'); return; }
    if (!form.type) { toast.error('Select a task type'); return; }
    setCreating(true);
    try {
      // Combine additional facts with instructions
      let combinedInstructions = '';
      if (form.additionalFacts.trim()) {
        combinedInstructions += `[ADDITIONAL FACTS / NEW EVIDENCE]\n${form.additionalFacts.trim()}\n\n`;
      }
      if (form.instructions.trim()) {
        combinedInstructions += form.instructions.trim();
      }
      const created = await tasksApi.create({ type: form.type, matterId: form.matterId, instructions: combinedInstructions || undefined, documentIds: form.documentIds.length > 0 ? form.documentIds : undefined });
      toast.success('Task created');
      setShowCreate(false);
      setForm({ type: 'case_summary', matterId: '', instructions: '', additionalFacts: '', documentIds: [] });
      router.push(`/tasks/${created?.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    } finally { setCreating(false); }
  };

  const handleExecute = async (taskId: string) => {
    setExecuting(taskId);
    try {
      await tasksApi.execute(taskId);
      toast.success('Task execution started');
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Execution failed');
    } finally { setExecuting(null); }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getMatterName = (matterId: string) => matters.find(m => m.id === matterId)?.title ?? null;
  const sortedTasks = [...(tasks ?? [])].sort((a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Analysis</h1>
          <p className="page-subtitle">Create and monitor AI-powered legal analysis</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 h-9"><Plus className="w-4 h-4" /> New Analysis</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : sortedTasks.length === 0 ? (
        <div className="card-elevated py-16 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground mb-4">No analysis tasks yet</p>
          <Button onClick={() => setShowCreate(true)} variant="outline"><Plus className="w-4 h-4 mr-1" /> Create Task</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTasks.map((task) => {
            const matterName = getMatterName(task?.matterId ?? '');
            return (
              <div key={task?.id} className="card-interactive">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {statusIcon(task?.status ?? 'pending')}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/tasks/${task?.id}`)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{TASK_TYPE_LABELS[(task?.taskType || task?.type) as TaskType] ?? task?.taskType ?? task?.type}</p>
                        <Badge variant="outline" className={cn('text-[10px] border', `status-${task?.status ?? 'pending'}`)}>{task?.status ?? 'pending'}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {matterName && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" /> {matterName}
                          </span>
                        )}
                        {task?.instructions && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[300px]">— {task.instructions}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(task?.createdAt ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task?.status === 'pending' && (
                        <Button size="sm" className="h-8 gap-1.5" onClick={() => handleExecute(task?.id ?? '')} disabled={executing === task?.id}>
                          {executing === task?.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Execute
                        </Button>
                      )}
                      {task?.status === 'succeeded' && (
                        <Link href={`/tasks/${task?.id}`}><Button variant="outline" size="sm" className="h-8">View Output</Button></Link>
                      )}
                    </div>
                  </div>
                  {task?.status === 'processing' && (
                    <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 flex items-center gap-3">
                      <div className="animate-pulse-ring"><Sparkles className="w-4 h-4 text-amber-500" /></div>
                      <div>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">AI is analyzing documents...</p>
                        <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Applying SMR v5.6 & LWP v1.3.3 protocols</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader><DialogTitle>Create AI Task</DialogTitle><DialogDescription>Configure an AI-powered legal analysis</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-3">
              <Label>Task Type *</Label>
              <div className="max-h-[280px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {Object.entries(TIER_TASK_GROUPS).map(([tierName, taskTypes]) => {
                  const tierKey = tierName.split(' ')[0];
                  return (
                    <div key={tierName} className="space-y-1.5">
                      <p className={cn('text-[10px] font-semibold uppercase tracking-wider', {
                        'text-slate-500': tierKey === 'Basic',
                        'text-slate-600': tierKey === 'Silver',
                        'text-amber-600': tierKey === 'Gold',
                        'text-purple-600': tierKey === 'Platinum'
                      })}>{tierName}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {taskTypes.map(t => {
                          const available = isTaskAvailableForTier(t, tier);
                          return (
                            <button
                              key={t}
                              onClick={() => available && setForm({ ...form, type: t })}
                              className={cn(
                                'p-2 rounded-lg border text-left transition-all',
                                form.type === t ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/60 hover:border-border',
                                !available && 'opacity-40 cursor-not-allowed bg-muted/50'
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium truncate">{TASK_TYPE_LABELS[t]}</span>
                                {!available && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{TASK_TYPE_DESCRIPTIONS[t]}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {tier === 'Basic' && (
                <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2">
                  🔒 Upgrade to Silver, Gold, or Platinum to unlock more task types.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Matter *</Label>
              <Select value={form.matterId} onValueChange={v => setForm({ ...form, matterId: v, documentIds: [] })}>
                <SelectTrigger><SelectValue placeholder="Select a matter" /></SelectTrigger>
                <SelectContent>{(matters ?? []).map(m => <SelectItem key={m?.id} value={m?.id ?? ''}>{m?.title ?? 'Untitled'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(documents?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label>Documents (optional)</Label>
                <div className="max-h-28 overflow-y-auto space-y-1.5 border rounded-lg p-2 custom-scrollbar">
                  {documents.map(doc => (
                    <label key={doc?.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.documentIds.includes(doc?.id ?? '')}
                        onCheckedChange={(checked) => {
                          const docId = doc?.id ?? '';
                          setForm(f => ({
                            ...f,
                            documentIds: checked ? [...f.documentIds, docId] : f.documentIds.filter(d => d !== docId)
                          }));
                        }}
                      />
                      <span className="text-xs truncate">{doc?.originalName ?? doc?.filename ?? 'Unknown'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Additional Facts / New Evidence <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Introduce new facts the AI should consider, e.g. &quot;An Occupational Health assessment dated 12/03/2026 concludes the claimant is fit for light duties.&quot;"
                value={form.additionalFacts}
                onChange={e => setForm({ ...form, additionalFacts: e.target.value })}
                rows={3}
                className="border-amber-200 dark:border-amber-800 focus-visible:ring-amber-400"
              />
              <p className="text-[11px] text-muted-foreground">Use this to provide facts not contained in the uploaded documents — the AI will incorporate them into its analysis.</p>
            </div>
            <div className="space-y-2">
              <Label>Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea placeholder="Additional instructions for the AI analysis..." value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                {creating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
