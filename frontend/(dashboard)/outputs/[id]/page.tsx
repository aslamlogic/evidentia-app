'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { outputsApi, mattersApi } from '@/lib/api';
import type { AIOutput, Matter } from '@/lib/types';
import { TASK_TYPE_LABELS } from '@/lib/types';
import type { TaskType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/breadcrumb';
import {
  Download, FileText, Printer, Shield,
  CheckCircle2, Layers, Calendar, Clock, Copy, FileOutput,
} from 'lucide-react';

export default function OutputDetailPage() {
  const params = useParams();
  const router = useRouter();
  const outputId = params?.id as string;
  const [output, setOutput] = useState<AIOutput | null>(null);
  const [matter, setMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!outputId) return;
    setLoading(true);
    try {
      const data = await outputsApi.get(outputId);
      setOutput(data);
      if (data?.matterId) {
        try {
          const m = await mattersApi.get(data.matterId);
          setMatter(m);
        } catch { /* ok */ }
      }
    } catch { /* handled */ } finally { setLoading(false); }
  }, [outputId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async (format: 'pdf' | 'docx') => {
    setExporting(format);
    try {
      const result = await outputsApi.export(outputId, format);
      if (result?.url) {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = `output_${outputId}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Exported as ${format.toUpperCase()}`);
      } else {
        toast.success('Export requested');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally { setExporting(null); }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output?.content ?? '');
      toast.success('Copied to clipboard');
    } catch { toast.error('Failed to copy'); }
  };

  const handlePrint = () => window.print();

  const taskType = TASK_TYPE_LABELS[output?.task?.type as TaskType] ?? 'AI Output';
  const confidence = output?.confidence != null ? Math.round((output.confidence ?? 0) * 100) : null;
  const compliance = output?.protocolCompliance;

  if (loading) return <div className="space-y-4"><div className="h-5 w-48 bg-muted rounded animate-pulse" /><div className="h-96 bg-muted rounded-xl animate-pulse" /></div>;
  if (!output) return <div className="text-center py-12"><FileOutput className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" /><p className="text-muted-foreground">Output not found</p><Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button></div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="no-print">
        <Breadcrumb items={[
          { label: 'Outputs', href: '/outputs' },
          ...(matter ? [{ label: matter.title, href: `/matters/${matter.id}` }] : []),
          { label: taskType },
        ]} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-title">{taskType}</h1>
            <Badge variant="outline" className="text-xs">v{output?.version ?? 1}</Badge>
            {confidence != null && (
              <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700">
                {confidence}% confidence
              </Badge>
            )}
          </div>
          {matter && <p className="text-sm text-muted-foreground mt-1">Matter: {matter.title}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8" onClick={handleCopy}><Copy className="w-3.5 h-3.5 mr-1" /> Copy</Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handlePrint}><Printer className="w-3.5 h-3.5 mr-1" /> Print</Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'}>
            <Download className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => handleExport('docx')} disabled={exporting === 'docx'}>
            <FileText className="w-3.5 h-3.5 mr-1" /> DOCX
          </Button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 no-print">
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs"><span className="text-muted-foreground">Version:</span> <span className="font-medium">v{output?.version ?? 1}</span></span>
        </div>
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <span className="text-xs"><span className="text-muted-foreground">Format:</span> <span className="font-medium capitalize">{output?.format ?? 'markdown'}</span></span>
        </div>
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{new Date(output?.createdAt ?? 0).toLocaleDateString()}</span>
        </div>
        <div className="card-flat flex items-center gap-2 px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{new Date(output?.createdAt ?? 0).toLocaleTimeString()}</span>
        </div>
        {confidence != null && (
          <div className="card-flat flex items-center gap-2 px-3 py-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <div className="confidence-bar w-20">
              <div className={cn(
                'confidence-bar-fill',
                confidence >= 75 ? 'bg-emerald-500' : confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )} style={{ width: `${confidence}%` }} />
            </div>
            <span className="text-xs font-medium">{confidence}%</span>
          </div>
        )}
      </div>

      {/* Protocol Compliance */}
      {compliance && (
        <div className={cn(
          'rounded-xl p-4 flex items-center gap-3 no-print border',
          compliance.compliant ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
        )}>
          <Shield className={cn('w-5 h-5', compliance.compliant ? 'text-emerald-600' : 'text-amber-600')} />
          <div className="flex-1">
            <p className="text-sm font-medium">{compliance.compliant ? 'Analysis Verified' : 'Partial Verification'}</p>
            <div className="flex items-center gap-2 mt-1">
              {compliance.smrVersion && <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700">Reasoning Verified</Badge>}
              {compliance.lwpVersion && <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700">Structure Verified</Badge>}
            </div>
            {compliance.details && <p className="text-xs text-muted-foreground mt-1">{compliance.details}</p>}
          </div>
          {compliance.compliant && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        </div>
      )}

      {/* Main Content */}
      <div className="card-elevated">
        <div className="px-6 py-4 border-b border-border/40 no-print">
          <h2 className="text-sm font-semibold flex items-center gap-2"><FileOutput className="w-4 h-4 text-primary" /> Analysis Output</h2>
        </div>
        <div className="p-6 sm:p-8">
          <div ref={contentRef} className="legal-output prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children, ...props }) => (
                  <div className="table-wrapper">
                    <table {...props}>{children}</table>
                  </div>
                ),
              }}
            >
              {output?.content ?? 'No content available.'}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Footer print stamp */}
      <div className="print-only hidden text-center text-xs text-gray-400 mt-8">
        <p>Generated by Evidentia AI Legal Intelligence Platform</p>
        {compliance?.smrVersion && <p>SMR {compliance.smrVersion} | LWP {compliance?.lwpVersion}</p>}
        <p>Output ID: {output?.id} | Version {output?.version ?? 1}</p>
      </div>
    </div>
  );
}
