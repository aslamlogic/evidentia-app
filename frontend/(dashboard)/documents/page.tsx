'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { documentsApi, mattersApi } from '@/lib/api';
import type { Document, Matter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { addNotification } from '@/components/notification-centre';
import { Upload, FileText, Search, Trash2, Loader2, File, HardDrive, FolderOpen, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadItem {
  file: File;
  status: 'queued' | 'uploading' | 'done' | 'failed';
  error?: string;
}

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, m] = await Promise.allSettled([documentsApi.list(), mattersApi.list()]);
      setDocuments(d.status === 'fulfilled' ? (Array.isArray(d.value) ? d.value : []) : []);
      setMatters(m.status === 'fulfilled' ? (Array.isArray(m.value) ? m.value : []) : []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (searchParams?.get('upload') === 'true') setShowUpload(true); }, [searchParams]);

  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

  const handleFilesSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid: FileUploadItem[] = [];
    let rejected = 0;
    for (const file of fileArray) {
      if (ALLOWED_TYPES.includes(file.type) || file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.txt')) {
        // Avoid duplicates
        if (!uploadFiles.some(uf => uf.file.name === file.name && uf.file.size === file.size)) {
          valid.push({ file, status: 'queued' });
        }
      } else {
        rejected++;
      }
    }
    if (rejected > 0) addNotification(`${rejected} file(s) skipped — only PDF, DOCX and TXT are supported`, 'error');
    if (valid.length > 0) setUploadFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) { addNotification('Select at least one file', 'error'); return; }
    if (!selectedMatterId) { addNotification('Select a matter', 'error'); return; }
    setUploading(true);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      const item = uploadFiles[i];
      if (item.status === 'done') { successCount++; continue; }

      // Mark as uploading
      setUploadFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));

      try {
        await documentsApi.upload(item.file, selectedMatterId);
        setUploadFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploadFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'failed', error: msg } : f));
        failCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      addNotification(`${successCount} document${successCount > 1 ? 's' : ''} uploaded successfully`, 'success');
      fetchData();
    }
    if (failCount > 0) {
      addNotification(`${failCount} document${failCount > 1 ? 's' : ''} failed to upload`, 'error');
    }

    // Auto-close if all succeeded
    if (failCount === 0) {
      setShowUpload(false);
      setUploadFiles([]);
      setSelectedMatterId('');
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && !uploading) {
      setShowUpload(false);
      setUploadFiles([]);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await documentsApi.delete(id);
      addNotification('Document deleted', 'success');
      fetchData();
    } catch (err: unknown) {
      addNotification(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const filtered = (documents ?? []).filter(d => {
    if (search && !(d?.originalName ?? '').toLowerCase().includes(search.toLowerCase()) && !(d?.filename ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getMatterName = (matterId?: string) => {
    if (!matterId) return null;
    const m = matters.find(m => m?.id === matterId);
    return m?.title ?? null;
  };

  const getFileIcon = (mime: string) => {
    if (mime?.includes('pdf')) return <File className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-blue-500" />;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'processed': return 'status-succeeded';
      case 'uploaded': return 'status-open';
      case 'error': return 'status-failed';
      default: return 'status-open';
    }
  };

  const completedCount = uploadFiles.filter(f => f.status === 'done').length;
  const totalCount = uploadFiles.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Manage uploaded legal documents</p>
        </div>
        <Button onClick={() => setShowUpload(true)} size="sm" className="gap-2">
          <Upload className="w-4 h-4" /> Upload
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated py-12 text-center">
          <HardDrive className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No documents found</p>
          <Button onClick={() => setShowUpload(true)} variant="outline" size="sm" className="mt-4">
            <Upload className="w-4 h-4 mr-1" /> Upload Document
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const matterName = getMatterName(doc?.matterId);
            return (
              <div key={doc?.id} className="card-interactive flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center">
                  {getFileIcon(doc?.mimeType ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc?.originalName ?? doc?.filename ?? 'Unknown'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {matterName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderOpen className="w-3 h-3" />{matterName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {((doc?.fileSize ?? 0) / 1024).toFixed(1)} KB \u00b7 {new Date(doc?.createdAt ?? 0).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className={cn('status-badge', getStatusClass(doc?.status ?? 'uploaded'))}>
                  {doc?.status ?? 'uploaded'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc?.id ?? '')} className="text-muted-foreground hover:text-destructive h-8 w-8">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog — Multi-file */}
      <Dialog open={showUpload} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>Upload multiple PDF, DOCX or TXT files for AI analysis</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Matter *</Label>
              <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
                <SelectTrigger><SelectValue placeholder="Select a matter" /></SelectTrigger>
                <SelectContent>{(matters ?? []).map(m => <SelectItem key={m?.id} value={m?.id ?? ''}>{m?.title ?? 'Untitled'}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length > 0) handleFilesSelect(e.dataTransfer.files);
              }}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag & drop files or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT · Multiple files supported</p>
              <input
                id="fileInput"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                multiple
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesSelect(e.target.files);
                    e.target.value = ''; // Reset so same files can be re-selected
                  }
                }}
              />
            </div>

            {/* File list */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{totalCount} file{totalCount > 1 ? 's' : ''} selected</Label>
                  {uploading && (
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{totalCount} uploaded
                    </span>
                  )}
                </div>

                {/* Progress bar (visible during upload) */}
                {uploading && totalCount > 0 && (
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    />
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                  {uploadFiles.map((item, idx) => (
                    <div key={`${item.file.name}-${idx}`} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/40 text-xs">
                      {item.status === 'queued' && <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                      {item.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />}
                      {item.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                      {item.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                      <span className="flex-1 truncate">{item.file.name}</span>
                      <span className="text-muted-foreground flex-shrink-0">
                        {(item.file.size / 1024).toFixed(0)} KB
                      </span>
                      {item.status === 'queued' && !uploading && (
                        <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="text-muted-foreground hover:text-destructive">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={uploading}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0 || !selectedMatterId}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? `Uploading ${completedCount + 1}/${totalCount}...` : `Upload ${totalCount || ''} File${totalCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
