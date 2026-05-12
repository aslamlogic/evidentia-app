'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { outputsApi, mattersApi } from '@/lib/api';
import type { AIOutput, Matter } from '@/lib/types';
import { TASK_TYPE_LABELS } from '@/lib/types';
import type { TaskType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { FileOutput, Calendar, FolderOpen, ArrowRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OutputsPage() {
  const router = useRouter();
  const [outputs, setOutputs] = useState<AIOutput[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, m] = await Promise.allSettled([outputsApi.list(), mattersApi.list()]);
      setOutputs(o.status === 'fulfilled' ? (Array.isArray(o.value) ? o.value : []) : []);
      setMatters(m.status === 'fulfilled' ? (Array.isArray(m.value) ? m.value : []) : []);
    } catch { setOutputs([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = [...(outputs ?? [])].sort((a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime());
  const getMatterName = (matterId: string) => matters.find(m => m.id === matterId)?.title ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Outputs</h1>
        <p className="page-subtitle">View AI-generated legal deliverables</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="card-elevated py-16 text-center">
          <FileOutput className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground">No outputs yet. Execute an AI task to generate outputs.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((output) => {
            const taskType = TASK_TYPE_LABELS[output?.task?.type as TaskType] ?? null;
            const matterName = getMatterName(output?.matterId ?? '');
            const confidence = output?.confidence != null ? Math.round((output.confidence ?? 0) * 100) : null;
            const preview = (output?.content ?? '').replace(/[#*_\[\]()>]/g, '').trim().slice(0, 120);

            return (
              <div
                key={output?.id}
                className="card-interactive px-5 py-4 group"
                onClick={() => router.push(`/outputs/${output?.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileOutput className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{taskType ?? 'Output'}</p>
                      <Badge variant="outline" className="text-[10px]">v{output?.version ?? 1}</Badge>
                      {confidence != null && (
                        <span className="text-[10px] text-emerald-600 font-medium">{confidence}% confidence</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {matterName && (
                        <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {matterName}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(output?.createdAt ?? 0).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{output?.format ?? 'markdown'}</span>
                    </div>
                    {preview && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 leading-relaxed">{preview}...</p>
                    )}
                    {confidence != null && (
                      <div className="confidence-bar w-32 mt-2">
                        <div className={cn(
                          'confidence-bar-fill',
                          confidence >= 75 ? 'bg-emerald-500' : confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        )} style={{ width: `${confidence}%` }} />
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
