'use client';

import { useState } from 'react';
import { BarChart3, ShieldAlert, AlertTriangle, Loader2, ChevronDown, Code } from 'lucide-react';
import { AnalyticsPanel, WorkflowEvent } from '@/lib/types';
import { DataChart } from './DataChart';
import { ProgressGraph } from './ProgressGraph';

interface ResultPanelProps {
  panel: AnalyticsPanel;
  workflowData?: unknown;
  events?: WorkflowEvent[];
}

export function ResultPanel({ panel, workflowData, events }: ResultPanelProps) {
  const [showSql, setShowSql] = useState(false);
  const r = panel.result;
  const hasLiveGraph = panel.status === 'running' && !!workflowData && !!events && events.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e3e6ea] bg-white shadow-[0_1px_3px_rgba(20,20,50,0.06)]">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-[#eceef1] px-4 py-3">
        <BarChart3 size={15} className="mt-0.5 shrink-0 text-[#e35b1f]" />
        <p className="flex-1 text-sm font-semibold text-[#1a1a2e]">{panel.question}</p>
        {panel.status === 'running' && <Loader2 size={15} className="animate-spin text-[#9aa1ac]" />}
      </div>

      {/* Body */}
      {panel.status === 'running' && (
        hasLiveGraph
          ? <ProgressGraph workflowData={workflowData} events={events!} />
          : <p className="px-4 py-10 text-center text-sm text-[#9aa1ac]">Running the Agent Studio workflow…</p>
      )}

      {panel.status === 'blocked' && (
        <div className="flex items-start gap-3 bg-[#fdf2f0] px-4 py-6">
          <ShieldAlert size={18} className="mt-0.5 text-[#c0392b]" />
          <div>
            <p className="text-sm font-semibold text-[#c0392b]">Blocked by guardrail</p>
            <p className="mt-1 text-sm text-[#6b7280]">{panel.message}</p>
          </div>
        </div>
      )}

      {panel.status === 'error' && (
        <div className="flex items-start gap-3 px-4 py-6">
          <AlertTriangle size={18} className="mt-0.5 text-[#e35b1f]" />
          <p className="text-sm text-[#6b7280]">{panel.message}</p>
        </div>
      )}

      {panel.status === 'done' && r && (
        <div className="space-y-3 p-4">
          {r.summary && <p className="text-sm text-[#374151]">{r.summary}</p>}

          <DataChart result={r} />

          {/* Data table */}
          {r.columns.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-[#eceef1]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f7f8fa]">
                    {r.columns.map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-1.5 text-left font-medium text-[#6b7280]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.rows.slice(0, 50).map((row, ri) => (
                    <tr key={ri} className="border-t border-[#f0f1f4]">
                      {row.map((cell, ci) => (
                        <td key={ci} className="whitespace-nowrap px-3 py-1.5 font-mono text-[13px] text-[#374151]">{String(cell ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {r.rows.length > 50 && (
                <p className="px-3 py-1.5 text-xs text-[#9aa1ac]">Showing 50 of {r.rows.length} rows</p>
              )}
            </div>
          )}

          {/* Generated SQL */}
          {r.sql && (
            <div>
              <button
                onClick={() => setShowSql((s) => !s)}
                className="flex items-center gap-1.5 text-xs text-[#6b7280] transition-colors hover:text-[#1a1a2e]"
              >
                <Code size={12} />
                <span>Generated SQL</span>
                <ChevronDown size={12} className={`transition-transform ${showSql ? 'rotate-180' : ''}`} />
              </button>
              {showSql && (
                <pre className="mt-2 overflow-x-auto rounded-lg border border-[#e3e6ea] bg-[#f7f8fa] p-3 font-mono text-xs text-[#2a1a5e]">
                  {r.sql}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
