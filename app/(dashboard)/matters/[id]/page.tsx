'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { mattersApi, documentsApi, tasksApi, outputsApi, knowledgeUnitsApi } from '@/lib/api';
import type { Matter, Document, AITask, AIOutput, KnowledgeUnit } from '@/lib/types';
import { MATTER_TYPE_LABELS, TASK_TYPE_LABELS, TASK_TYPE_DESCRIPTIONS, isTaskAvailableForTier } from '@/lib/types';
import type { TaskType } from '@/lib/types';
import { useAuthStore } from '@/lib/auth-store';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/breadcrumb';
import {
  FileText, Brain, FileOutput, Upload, Trash2,
  Calendar, User, Edit, Loader2, CheckCircle2, Clock, AlertCircle,
  ExternalLink, FolderOpen, Lightbulb, Lock, Plus,
} from 'lucide-react';

const TIER_TASK_GROUPS: Record<string, TaskType[]> = {
  'Basic (Tier 1)': ['scoping_analysis', 'laws_affected', 'case_summary'],
  'Silver (Tier 2)': ['chronology', 'issues_list', 'cause_of_action_matrix', 'breaches_map', 'evidence_schedule'],
  'Gold (Tier 3)': ['drafting_pack', 'defenses_prosecution'],
  'Platinum (Tier 4)': ['lawyer_case_pack', 'adversarial_analysis', 'stress_test'],
};

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matterId = params?.id as string;
  const [matter, setMatter] = useState<Matter | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [outputs, setOutputs] = useState<AIOutput[]>([]);
  const [knowledgeUnits, setKnowledgeUnits] = useState<KnowledgeUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{file: File; status: 'queued'|'uploading'|'done'|'failed'; error?: string}[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{done: number; failed: number; total: number} | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: 'open' as Matter['status'], clientName: '', clientEmail: '' });
  const [saving, setSaving] = useState(false);
  // Create Task dialog state
  const { user } = useAuthStore();
  const tier = (user?.subscriptionTier ?? 'Basic') as string;
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ type: '' as TaskType | '', additionalFacts: '', instructions: '', documentIds: [] as string[] });
  const [creatingTask, setCreatingTask] = useState(false);

  const fetchData = useCallback(async () => {
    if (!matterId) return;
    setLoading(true);
    try {
      const [m, d, t, o, k] = await Promise.allSettled([
        mattersApi.get(matterId),
        documentsApi.list(matterId),
        tasksApi.list(),
        outputsApi.list(),
        knowledgeUnitsApi.listByMatter(matterId),
      ]);
      const matterData = m.status === 'fulfilled' ? m.value : null;
      setMatter(matterData);
      if (matterData) {
        setEditForm({ title: matterData?.title ?? '', description: matterData?.description ?? '', status: (matterData?.status ?? 'open') as Matter['status'], clientName: matterData?.clientName ?? '', clientEmail: matterData?.clientEmail ?? '' });
      }
      setDocuments(d.status === 'fulfilled' ? (Array.isArray(d.value) ? d.value : []) : []);
      const allTasks = t.status === 'fulfilled' ? (Array.isArray(t.value) ? t.value : []) : [];
      setTasks(allTasks.filter(tk => tk?.matterId === matterId));
      const allOutputs = o.status === 'fulfilled' ? (Array.isArray(o.value) ? o.value : []) : [];
      setOutputs(allOutputs.filter(op => op?.matterId === matterId));
      setKnowledgeUnits(k.status === 'fulfilled' ? (Array.isArray(k.value) ? k.value : []) : []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [matterId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const valid = files.filter(f => allowed.includes(f.type));
    const rejected = files.length - valid.length;
    if (rejected > 0) toast.error(`${rejected} file(s) skipped — only PDF and DOCX supported`);
    if (!valid.length) return;

    const queue = valid.map(f => ({ file: f, status: 'queued' as const }));
    setUploadQueue(queue);
    setUploadProgress({ done: 0, failed: 0, total: valid.length });
    setUploading(true);

    let done = 0, failed = 0;
    for (let i = 0; i < queue.length; i++) {
      setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));
      try {
        await documentsApi.upload(queue[i].file, matterId);
        done++;
        setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done' } : item));
      } catch (err: unknown) {
        failed++;
        setUploadQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' } : item));
      }
      setUploadProgress({ done, failed, total: valid.length });
    }

    toast.success(`Upload complete: ${done} succeeded${failed ? `, ${failed} failed` : ''}`);
    setUploading(false);
    fetchData();
    // Reset after a moment so user can see final state
    setTimeout(() => { setUploadQueue([]); setUploadProgress(null); }, 3000);
    e.target.value = '';
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await mattersApi.update(matterId, editForm);
      toast.success('Matter updated');
      setShowEdit(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this matter? This will also delete associated documents, tasks, and outputs.')) return;
    try {
      await mattersApi.delete(matterId);
      toast.success('Matter deleted');
      router.replace('/matters');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.type) { toast.error('Select a task type'); return; }
    setCreatingTask(true);
    try {
      let combinedInstructions = '';
      if (taskForm.additionalFacts.trim()) {
        combinedInstructions += `[ADDITIONAL FACTS / NEW EVIDENCE]\n${taskForm.additionalFacts.trim()}\n\n`;
      }
      if (taskForm.instructions.trim()) {
        combinedInstructions += taskForm.instructions.trim();
      }
      const created = await tasksApi.create({
        type: taskForm.type as TaskType,
        matterId,
        instructions: combinedInstructions || undefined,
        documentIds: taskForm.documentIds.length > 0 ? taskForm.documentIds : undefined,
      });
      toast.success('Task created');
      setShowCreateTask(false);
      setTaskForm({ type: '', additionalFacts: '', instructions: '', documentIds: [] });
      router.push(`/tasks/${created?.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    } finally { setCreatingTask(false); }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-5 w-48 bg-muted rounded animate-pulse" /><div className="h-40 bg-muted rounded-xl animate-pulse" /></div>;
  }

  if (!matter) {
    return <div className="text-center py-12"><FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" /><p className="text-muted-foreground">Matter not found</p><Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button></div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Matters', href: '/matters' },
        { label: matter?.title ?? 'Untitled' },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-title truncate">{matter?.title ?? 'Untitled'}</h1>
            <Badge variant="outline" className="text-xs font-medium">{MATTER_TYPE_LABELS[matter?.type ?? ''] ?? matter?.type}</Badge>
            <Badge variant="outline" className={cn('text-xs border', `status-${matter?.status ?? 'open'}`)}>{matter?.status ?? 'open'}</Badge>
          </div>
          {matter?.description && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{matter.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit</Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 border-destructive/30"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-3">
        {matter?.clientName && (
          <div className="card-flat flex items-center gap-2 px-3 py-2">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs"><span className="text-muted-foreground">Client:</span> <span className="font-medium">{matter.clientName}</span></span>
          </div>
        )}
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs"><span className="text-muted-foreground">Created:</span> <span className="font-medium">{new Date(matter?.createdAt ?? 0).toLocaleDateString()}</span></span>
        </div>
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{documents?.length ?? 0} documents</span>
        </div>
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <Brain className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{tasks?.length ?? 0} tasks</span>
        </div>
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <FileOutput className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{outputs?.length ?? 0} outputs</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> Documents ({documents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs"><Brain className="w-3.5 h-3.5" /> Tasks ({tasks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="outputs" className="gap-1.5 text-xs"><FileOutput className="w-3.5 h-3.5" /> Outputs ({outputs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="knowledge-units" className="gap-1.5 text-xs"><Lightbulb className="w-3.5 h-3.5" /> KUs ({knowledgeUnits?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Upload PDF or DOCX files for AI analysis</p>
            <label className="cursor-pointer">
              <input type="file" className="hidden" accept=".pdf,.docx" multiple onChange={handleUpload} disabled={uploading} />
              <Button asChild size="sm" disabled={uploading}><span>{uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}{uploading ? 'Uploading...' : 'Upload Files'}</span></Button>
            </label>
          </div>
          {/* Upload Progress */}
          {uploadProgress && (
            <div className="card-flat p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Uploading {uploadProgress.done + uploadProgress.failed} of {uploadProgress.total}</span>
                <span className="text-muted-foreground">{uploadProgress.done} done{uploadProgress.failed > 0 && `, ${uploadProgress.failed} failed`}</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((uploadProgress.done + uploadProgress.failed) / uploadProgress.total) * 100}%` }} />
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {uploadQueue.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {item.status === 'queued' && <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {item.status === 'uploading' && <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />}
                    {item.status === 'done' && <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />}
                    {item.status === 'failed' && <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
                    <span className="truncate flex-1">{item.file.name}</span>
                    {item.error && <span className="text-destructive truncate max-w-[140px]">{item.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(documents?.length ?? 0) === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No documents yet</p></div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc?.id} className="card-flat flex items-center gap-3 p-3">
                  <FileText className={cn('w-5 h-5 flex-shrink-0', doc?.mimeType?.includes('pdf') ? 'text-red-500' : 'text-blue-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc?.originalName ?? doc?.filename ?? 'Unknown'}</p>
                    <p className="text-[11px] text-muted-foreground">{((doc?.fileSize ?? 0) / 1024).toFixed(1)} KB · {doc?.status ?? 'uploaded'}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] border', `status-${doc?.status ?? 'pending'}`)}>{doc?.status ?? 'uploaded'}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">AI-powered analysis tasks for this matter</p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreateTask(true)}><Plus className="w-3.5 h-3.5" /> New Task</Button>
          </div>
          {(tasks?.length ?? 0) === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><Brain className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No tasks yet</p></div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <Link key={task?.id} href={`/tasks/${task?.id}`}>
                  <div className="card-interactive flex items-center gap-3 p-3">
                    {statusIcon(task?.status ?? 'pending')}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{TASK_TYPE_LABELS[(task?.taskType || task?.type) as TaskType] ?? task?.type}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{task?.instructions ?? 'No instructions'}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] border', `status-${task?.status ?? 'pending'}`)}>{task?.status ?? 'pending'}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outputs" className="space-y-4 mt-4">
          {(outputs?.length ?? 0) === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><FileOutput className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No outputs yet. Execute an AI task to generate outputs.</p></div>
          ) : (
            <div className="space-y-2">
              {outputs.map(output => {
                const taskType = tasks.find(t => t.id === output.taskId);
                return (
                  <Link key={output?.id} href={`/outputs/${output?.id}`}>
                    <div className="card-interactive flex items-center gap-3 p-3">
                      <FileOutput className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{TASK_TYPE_LABELS[(taskType?.taskType || taskType?.type || output?.task?.type) as TaskType] ?? 'AI Output'} <span className="text-muted-foreground">v{output?.version ?? 1}</span></p>
                        <p className="text-[11px] text-muted-foreground">{new Date(output?.createdAt ?? 0).toLocaleString()}</p>
                      </div>
                      {output?.confidence != null && (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">confidence</p>
                          <div className="confidence-bar w-16 mt-0.5">
                            <div className="confidence-bar-fill bg-emerald-500" style={{ width: `${Math.round((output.confidence ?? 0) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge-units" className="space-y-4 mt-4">
          <p className="text-xs text-muted-foreground">Discrete knowledge statements extracted from AI analysis under KUP v1.5</p>
          {(knowledgeUnits?.length ?? 0) === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No Knowledge Units extracted yet</p><p className="text-xs mt-1">Run an AI task to generate KUs from your documents</p></div>
          ) : (
            <div className="space-y-2">
              {knowledgeUnits.map((ku) => (
                <div key={ku.id} className="card-flat p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-[10px]', ku.modality === 'Normative' ? 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400' : 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400')}>
                      {ku.modality}
                    </Badge>
                    {ku.tierExtracted && (
                      <Badge variant="outline" className={cn('text-[10px]', `tier-${ku.tierExtracted?.toLowerCase()}`)}>{ku.tierExtracted}</Badge>
                    )}
                    {ku.confidence != null && (
                      <span className="text-[10px] text-muted-foreground ml-auto">{Math.round(ku.confidence * 100)}% confidence</span>
                    )}
                  </div>
                  <blockquote className="text-xs border-l-2 border-primary/30 pl-2 italic text-muted-foreground">&ldquo;{ku.quotationText}&rdquo;</blockquote>
                  <p className="text-xs font-medium">{ku.analyticalParaphrase}</p>
                  <p className="text-[11px] text-muted-foreground">{ku.interpretiveCommentary}</p>
                  {ku.sourceReference && (
                    <p className="text-[10px] text-muted-foreground/70">Source: {ku.sourceReference}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Edit Matter</DialogTitle><DialogDescription>Update matter details</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v as Matter['status']})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Client Name</Label><Input value={editForm.clientName} onChange={e => setEditForm({...editForm, clientName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Client Email</Label><Input value={editForm.clientEmail} onChange={e => setEditForm({...editForm, clientEmail: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog — inline on matter detail page */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> New Analysis</DialogTitle>
            <DialogDescription>Create an analysis task for <span className="font-medium text-foreground">{matter?.title}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Task Type Selector */}
            <div className="space-y-3">
              <Label>Task Type *</Label>
              <div className="max-h-[240px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {Object.entries(TIER_TASK_GROUPS).map(([tierName, taskTypes]) => {
                  const tierKey = tierName.split(' ')[0];
                  return (
                    <div key={tierName} className="space-y-1.5">
                      <p className={cn('text-[10px] font-semibold uppercase tracking-wider', {
                        'text-slate-500': tierKey === 'Basic',
                        'text-slate-600': tierKey === 'Silver',
                        'text-amber-600': tierKey === 'Gold',
                        'text-purple-600': tierKey === 'Platinum',
                      })}>{tierName}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {taskTypes.map(t => {
                          const available = isTaskAvailableForTier(t, tier);
                          return (
                            <button
                              key={t}
                              onClick={() => available && setTaskForm({ ...taskForm, type: t })}
                              className={cn(
                                'p-2 rounded-lg border text-left transition-all',
                                taskForm.type === t ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/60 hover:border-border',
                                !available && 'opacity-40 cursor-not-allowed bg-muted/50',
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
            </div>

            {/* Document Selection */}
            {documents.length > 0 && (
              <div className="space-y-2">
                <Label>Documents <span className="text-muted-foreground font-normal">(optional — defaults to all)</span></Label>
                <div className="max-h-28 overflow-y-auto space-y-1.5 border rounded-lg p-2 custom-scrollbar">
                  {documents.map(doc => (
                    <label key={doc?.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={taskForm.documentIds.includes(doc?.id ?? '')}
                        onCheckedChange={(checked) => {
                          const docId = doc?.id ?? '';
                          setTaskForm(f => ({
                            ...f,
                            documentIds: checked ? [...f.documentIds, docId] : f.documentIds.filter(d => d !== docId),
                          }));
                        }}
                      />
                      <span className="text-xs truncate">{doc?.originalName ?? doc?.filename ?? 'Unknown'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Facts — prominent, first content field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Additional Facts / New Evidence
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder={'Introduce new facts the AI should consider, e.g.\n"An Occupational Health assessment dated 12/03/2026 concludes the claimant is fit for light duties."'}
                value={taskForm.additionalFacts}
                onChange={e => setTaskForm({ ...taskForm, additionalFacts: e.target.value })}
                rows={3}
                className="border-amber-200 dark:border-amber-800 focus-visible:ring-amber-400"
              />
              <p className="text-[11px] text-muted-foreground">Provide facts not contained in the uploaded documents — the AI will incorporate them as substantive evidence.</p>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label>Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Additional instructions for the AI analysis..."
                value={taskForm.instructions}
                onChange={e => setTaskForm({ ...taskForm, instructions: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateTask(false)}>Cancel</Button>
              <Button onClick={handleCreateTask} disabled={creatingTask}>
                {creatingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                {creatingTask ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
