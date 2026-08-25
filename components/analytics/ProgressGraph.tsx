'use client';

/**
 * ProgressGraph — light-themed live pipeline strip for the analytics dashboard.
 * Reuses the same client-side DAG derivation as the workflow page
 * (lib/workflowGraph.deriveGraph) but renders compact pills that match the
 * Applied-ML-Prototype light aesthetic (indigo/orange), no dark SVG panel.
 */
import { useMemo } from 'react';
import { WorkflowEvent } from '@/lib/types';
import { deriveGraph, shortToolName, DerivedNode } from '@/lib/workflowGraph';

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-[#e3e6ea] bg-[#f4f5f7] text-[#9aa1ac]',
  running:   'border-[#e35b1f] bg-[#fff1ea] text-[#c94e18] animate-pulse',
  completed: 'border-[#b7e4c7] bg-[#eaf7ef] text-[#1e7a43]',
  abstained: 'border-[#f3d19b] bg-[#fdf6ea] text-[#b6791f]',
  error:     'border-[#f1b0a8] bg-[#fdecea] text-[#c0392b]',
};

const nodeStyle = (n: DerivedNode) => STATUS_STYLES[n.status] ?? STATUS_STYLES.pending;

export function ProgressGraph({ workflowData, events }: { workflowData: unknown; events: WorkflowEvent[] }) {
  const { nodes } = useMemo(
    () => (workflowData ? deriveGraph(workflowData, events) : { nodes: [], edges: [] }),
    [workflowData, events],
  );

  if (nodes.length === 0) return null;

  const doneCount = nodes.filter((n) => n.status === 'completed').length;

  return (
    <div className="px-4 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[#9aa1ac]">Workflow progress</span>
        <span className="text-xs text-[#9aa1ac]">{doneCount}/{nodes.length} done</span>
      </div>
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
        {nodes.map((n, i) => (
          <div key={n.id} className="flex items-center gap-1.5">
            <div className={`min-w-[104px] rounded-lg border px-2.5 py-2 ${nodeStyle(n)}`}>
              <p className="truncate text-xs font-semibold">{n.label}</p>
              {n.tools.length > 0 && (
                <p className="mt-0.5 truncate text-[10px] opacity-80">
                  {n.tools.slice(0, 2).map((t) => (t.error ? '⚠ ' : '') + shortToolName(t.name)).join(' · ')}
                  {n.tools.length > 2 ? ` +${n.tools.length - 2}` : ''}
                </p>
              )}
              {n.llmCalls > 0 && (
                <p className="mt-0.5 text-[10px] opacity-70">{n.llmCalls} LLM call{n.llmCalls > 1 ? 's' : ''}</p>
              )}
            </div>
            {i < nodes.length - 1 && <span className="shrink-0 text-[#c8cdd4]">&rarr;</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
