'use client';

import { useState, useCallback, DragEvent, ChangeEvent, useRef } from 'react';
import { Upload, File, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { createApiClient } from '@/lib/api';
import { uploadFile } from '@/lib/fileUpload';

interface FileUploadInputProps {
  name: string;
  label: string;
  onChange: (name: string, value: string) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function FileUploadInput({ name, label, onChange }: FileUploadInputProps) {
  const { workflowUrl, apiKey, sessionId } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!sessionId) {
        setStatus('error');
        setErrorMsg('No active session. Please reconnect.');
        return;
      }

      setFileName(file.name);
      setStatus('uploading');
      setProgress(0);
      setErrorMsg(null);

      try {
        const client = createApiClient({ workflowUrl, apiKey });
        const filePath = await uploadFile(file, sessionId, client, (p) => {
          setProgress(p.progress);
        });
        onChange(name, filePath);
        setStatus('success');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
        setStatus('error');
      }
    },
    [workflowUrl, apiKey, sessionId, name, onChange],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleReset = () => {
    setStatus('idle');
    setFileName(null);
    setProgress(0);
    setErrorMsg(null);
    onChange(name, '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-micro font-medium tracking-wide uppercase text-white/50">
        {label}
      </label>

      {status === 'idle' || status === 'error' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-large border-2 border-dashed px-6 py-8 transition-colors duration-200 ${
            isDragging
              ? 'border-apple-bright-blue/60 bg-apple-bright-blue/5'
              : 'border-white/[0.10] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Upload size={22} className="text-white/30" />
          <div className="text-center">
            <p className="text-caption text-white/60">
              Drop a file or <span className="text-apple-bright-blue">browse</span>
            </p>
          </div>
          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-1.5 text-red-400">
              <XCircle size={13} />
              <span className="text-nano">{errorMsg}</span>
            </div>
          )}
        </div>
      ) : status === 'uploading' ? (
        <div className="flex items-center gap-4 rounded-large border border-white/[0.08] bg-white/[0.04] px-5 py-4">
          <Loader size={16} className="shrink-0 animate-spin text-apple-bright-blue" />
          <div className="flex-1 min-w-0">
            <p className="text-caption text-white/70 truncate">{fileName}</p>
            <div className="mt-2 h-1 rounded-full bg-white/10">
              <div
                className="h-1 rounded-full bg-apple-blue transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
          <span className="text-micro text-white/40 shrink-0">{Math.round(progress * 100)}%</span>
        </div>
      ) : (
        // success
        <div className="flex items-center gap-3 rounded-large border border-white/[0.08] bg-white/[0.04] px-5 py-4">
          <CheckCircle size={16} className="shrink-0 text-emerald-400" />
          <div className="flex-1 min-w-0">
            <p className="text-caption text-white/70 truncate">{fileName}</p>
            <p className="text-nano text-white/30">Uploaded successfully</p>
          </div>
          <button
            onClick={handleReset}
            className="text-nano text-white/30 hover:text-white/60 transition-colors cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
