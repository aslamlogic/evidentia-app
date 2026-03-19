'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { mattersApi, tasksApi, outputsApi, documentsApi } from '@/lib/api';
import type { Matter, AITask, AIOutput } from '@/lib/types';
import { TIER_FEATURES, TASK_TYPE_LABELS } from '@/lib/types';
import type { TaskType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen, Brain, FileOutput, FileText, Plus, Upload,
  ArrowRight, CheckCircle2, AlertCircle, Loader2, Clock,
  Zap, Play, Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 600;
    const step = Math.max(1, Math.floor(value / (duration / 16)));
    if (value === 0) { setDisplay(0); return; }
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else { setDisplay(start); }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [outputs, setOutputs] = useState<AIOutput[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t, o, d] = await Promise.allSettled([
        mattersApi.list(), tasksApi.list(), outputsApi.list(), documentsApi.list(),
      ]);
      setMatters(m.status === 'fulfilled' ? (Array.isArray(m.value) ? m.value : []) : []);
      setTasks(t.status === 'fulfilled' ? (Array.isArray(t.value) ? t.value : []) : []);
      setOutputs(o.status === 'fulfilled' ? (Array.isArray(o.value) ? o.value : []) : []);
      setDocCount(d.status === 'fulfilled' ? (Array.isArray(d.value) ? d.value.length : 0) : 0);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tier = user?.subscriptionTier ?? 'Basic';
  const tierConfig = TIER_FEATURES[tier] ?? TIER_FEATURES.Basic;
  const activeMatters = matters?.filter((m) => m?.status === 'open')?.length ?? 0;
  const pendingTasks = tasks?.filter((t) => t?.status === 'pending' || t?.status === 'processing')?.length ?? 0;
  const completedOutputs = outputs?.length ?? 0;
  const recentTasks = [...(tasks ?? [])].sort((a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime()).slice(0, 5);
  const recentMatters = [...(matters ?? [])].sort((a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime()).slice(0, 3);

  const statCards = [
    { label: 'Active Matters', value: activeMatters, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-500/10', href: '/matters' },
    { label: 'Analysis', value: pendingTasks, sublabel: 'in progress', icon: Brain, color: 'text-amber-600', bg: 'bg-amber-500/10', href: '/tasks' },
    { label: 'AI Outputs', value: completedOutputs, sublabel: 'generated', icon: FileOutput, color: 'text-emerald-600', bg: 'bg-emerald-500/10', href: '/outputs' },
    { label: 'Documents', value: docCount, sublabel: 'uploaded', icon: FileText, color: 'text-violet-600', bg: 'bg-violet-500/10', href: '/documents' },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Welcome back, {user?.firstName ?? 'Counsel'}</h1>
          <p className="page-subtitle">Your active matters, documents and analysis</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Link href="/matters?new=true">
            <Button size="sm" className="gap-1.5 h-9"><Plus className="w-3.5 h-3.5" /> New Matter</Button>
          </Link>
          <Link href="/tasks?new=true">
            <Button size="sm" variant="outline" className="gap-1.5 h-9"><Brain className="w-3.5 h-3.5" /> New Task</Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <Link key={card.label} href={card.href}>
            <div className="card-interactive p-4 group" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', card.bg)}>
                  <card.icon className={cn('w-[18px] h-[18px]', card.color)} />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
              </div>
              <p className="text-2xl font-bold tracking-tight"><AnimatedCounter value={card.value} /></p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Tasks — main column */}
        <div className="lg:col-span-3 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Recent Analysis</h2>
            <Link href="/tasks" className="text-xs text-muted-foreground hover:text-primary transition-colors">View all →</Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground mb-3">No analysis tasks yet</p>
              <Link href="/tasks?new=true"><Button variant="outline" size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Create your first task</Button></Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => {
                const matterName = matters.find(m => m.id === task.matterId)?.title;
                return (
                  <Link key={task?.id} href={`/tasks/${task?.id}`}>
                    <div className="card-interactive flex items-center gap-3 px-4 py-3">
                      {statusIcon(task?.status ?? 'pending')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{TASK_TYPE_LABELS[(task?.taskType || task?.type) as TaskType] ?? task?.type}</p>
                        {matterName && <p className="text-[11px] text-muted-foreground truncate">in {matterName}</p>}
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] capitalize border', `status-${task?.status ?? 'pending'}`)}>{task?.status ?? 'pending'}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="section-title mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/matters?new=true">
                <div className="card-interactive flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><FolderOpen className="w-4 h-4 text-blue-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New Matter</p>
                    <p className="text-[11px] text-muted-foreground">Create a new legal case</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/documents?upload=true">
                <div className="card-interactive flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center"><Upload className="w-4 h-4 text-violet-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Upload Document</p>
                    <p className="text-[11px] text-muted-foreground">Add PDF or DOCX files</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/tasks?new=true">
                <div className="card-interactive flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Brain className="w-4 h-4 text-amber-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Run Analysis</p>
                    <p className="text-[11px] text-muted-foreground">Start a new legal analysis</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </div>

          {/* Your Plan */}
          <div>
            <h2 className="section-title mb-3">Your Plan</h2>
            <div className={cn(
              'rounded-xl p-4 border',
              tier === 'Platinum' ? 'bg-purple-50/50 border-purple-200' :
              tier === 'Gold' ? 'bg-amber-50/50 border-amber-200' :
              tier === 'Silver' ? 'bg-slate-50 border-slate-200' :
              'bg-slate-50 border-slate-200'
            )}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                  tier === 'Platinum' ? 'bg-purple-100' : tier === 'Gold' ? 'bg-amber-100' : 'bg-slate-200'
                )}>
                  <Zap className={cn('w-4 h-4',
                    tier === 'Platinum' ? 'text-purple-600' : tier === 'Gold' ? 'text-amber-600' : 'text-slate-600'
                  )} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{tier}</p>
                  <p className="text-[11px] text-muted-foreground">{tierConfig?.tasks?.length ?? 0} task types · {tierConfig?.maxDocs ?? 5} docs max</p>
                </div>
              </div>
              <div className="h-px bg-border/60 my-2" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {(tierConfig?.tasks ?? []).slice(0, 6).map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate">{TASK_TYPE_LABELS[t] ?? t}</span>
                  </div>
                ))}
                {(tierConfig?.tasks?.length ?? 0) > 6 && (
                  <p className="text-[11px] text-muted-foreground col-span-2">+{(tierConfig?.tasks?.length ?? 0) - 6} more</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
