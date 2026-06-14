'use client';

import { useState, useRef, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { ArrowUp, Paperclip, X, Loader } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { createApiClient } from '@/lib/api';
import { uploadFile } from '@/lib/fileUpload';

export interface AttachmentState {
  name: string;
  path: string;
}

interface ChatInputProps {
  onSend: (message: string, attachment?: AttachmentState) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Message…',
}: ChatInputProps) {
  const { workflowUrl, apiKey, sessionId } = useWorkflowStore();

  const [value, setValue] = useState('');
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && !attachment) || disabled || isUploading) return;
    onSend(trimmed, attachment ?? undefined);
    setValue('');
    setAttachment(null);
    setUploadError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, attachment, disabled, isUploading, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Demo mode: no session available — just attach name without uploading
    if (!sessionId) {
      setAttachment({ name: file.name, path: `[demo]/${file.name}` });
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const client = createApiClient({ workflowUrl, apiKey });
      const filePath = await uploadFile(file, sessionId, client);
      setAttachment({ name: file.name, path: filePath });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const canSend = (value.trim().length > 0 || attachment !== null) && !disabled && !isUploading;

  return (
    <div className="flex flex-col gap-2">
      {/* Attachment preview inside input area */}
      {(attachment || isUploading) && (
        <div className="flex items-center gap-2 px-1">
          {isUploading ? (
            <div className="flex items-center gap-1.5 text-white/40">
              <Loader size={12} className="animate-spin" />
              <span className="text-nano">Uploading…</span>
            </div>
          ) : attachment ? (
            <div className="flex items-center gap-1.5 rounded-full border border-apple-bright-blue/20 bg-apple-bright-blue/10 px-2.5 py-1">
              <Paperclip size={11} className="text-apple-bright-blue" />
              <span className="text-nano text-apple-bright-blue max-w-[200px] truncate">{attachment.name}</span>
              <button
                onClick={() => setAttachment(null)}
                className="ml-0.5 text-apple-bright-blue/60 hover:text-apple-bright-blue cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          ) : null}
          {uploadError && (
            <span className="text-nano text-red-400">{uploadError}</span>
          )}
        </div>
      )}

      {/* Input bar */}
      <div className="relative flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 transition-colors focus-within:border-white/[0.15] focus-within:bg-white/[0.06]">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/25 hover:text-white/60 transition-colors cursor-pointer disabled:opacity-30"
          title="Attach file"
        >
          <Paperclip size={15} />
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/25 outline-none"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
            canSend
              ? 'bg-apple-blue text-white hover:bg-[#0077ed]'
              : 'bg-white/[0.06] text-white/20'
          }`}
        >
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
