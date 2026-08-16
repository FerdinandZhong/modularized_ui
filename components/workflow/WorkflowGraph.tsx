'use client';

/**
 * WorkflowGraph — live DAG panel derived entirely from the Agent Studio contract.
 *
 * No custom backend endpoint: topology comes from the workflow config
 * (GET /api/workflow) and live status/tool activity is folded from the event
 * stream we already poll. Works for ANY sequential Agent Studio workflow.
 */

import { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import { useEventStore } from '@/stores/eventStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { deriveGraph, shortToolName, DerivedNode } from '@/lib/workflowGraph';

// ── Status → color mapping ─────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  pending:   { fill: '#1c1c1e', stroke: '#3a3a3c', text: '#6b6b6b' },
  running:   { fill: '#0a2540', stroke: '#2997ff', text: '#2997ff' },
  completed: { fill: '#0a2e1a', stroke: '#30d158', text: '#30d158' },
  abstained: { fill: '#2d1b00', stroke: '#ff9f0a', text: '#ff9f0a' },
  error:     { fill: '#2d0a0a', stroke: '#ff453a', text: '#ff453a' },
};

const nodeColor = (n: DerivedNode) => STATUS_COLORS[n.status] ?? STATUS_COLORS.pending;

// ── Layout ──────────────────────────────────────────────────────────────────────
const NODE_W = 130;
const NODE_H = 50;
const H_GAP  = 34;
const ARROW  = 8;
const SVG_H  = 120;

export function WorkflowGraph() {
  const { workflowData } = useWorkflowStore();
  const { events, isRunning } = useEventStore();

  const graph = useMemo(
    () => (workflowData ? deriveGraph(workflowData, events) : { nodes: [], edges: [] }),
    [workflowData, events],
  );

  const { nodes, edges } = graph;
  if (nodes.length === 0) return null;

  const idxById: Record<string, number> = {};
  nodes.forEach((n, i) => { idxById[n.id] = i; });

  const totalW = nodes.length * NODE_W + (nodes.length - 1) * H_GAP;
  const svgW   = totalW + 40;
  const cx = (i: number) => 20 + i * (NODE_W + H_GAP) + NODE_W / 2;
  const cy = SVG_H / 2 - 8;

  const doneCount = nodes.filter((n) => n.status === 'completed').length;

  return (
    <div className="flex flex-col border-b border-white/[0.06]" style={{ minHeight: SVG_H + 36 }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-2 shrink-0">
        <GitBranch size={12} className={isRunning ? 'text-apple-bright-blue animate-pulse' : 'text-white/30'} />
        <span className="text-micro font-medium tracking-wider uppercase text-white/40">
          Workflow Graph
        </span>
        <span className="ml-auto text-nano text-white/20">{doneCount}/{nodes.length} done</span>
      </div>

      {/* SVG DAG */}
      <div className="overflow-x-auto px-2 py-2">
        <svg viewBox={`0 0 ${svgW} ${SVG_H}`} width="100%" style={{ maxHeight: SVG_H, minWidth: totalW + 40 }}>
          {/* Edges */}
          {edges.map((e) => {
            const si = idxById[e.source];
            const ti = idxById[e.target];
            if (si === undefined || ti === undefined) return null;
            const x1 = cx(si) + NODE_W / 2;
            const x2 = cx(ti) - NODE_W / 2;
            return (
              <g key={`${e.source}-${e.target}`}>
                <line x1={x1} y1={cy} x2={x2 - ARROW} y2={cy} stroke="#3a3a3c" strokeWidth={1.5} />
                <polygon points={`${x2},${cy} ${x2 - ARROW},${cy - 4} ${x2 - ARROW},${cy + 4}`} fill="#3a3a3c" />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n, i) => {
            const col = nodeColor(n);
            const x = cx(i) - NODE_W / 2;
            const y = cy - NODE_H / 2;
            const isAnim = n.status === 'running';
            const shownTools = n.tools.slice(0, 2);
            const extraTools = n.tools.length - shownTools.length;

            return (
              <g key={n.id}>
                {isAnim && (
                  <rect
                    x={x - 3} y={y - 3} width={NODE_W + 6} height={NODE_H + 6}
                    rx={9} fill="none" stroke={col.stroke} strokeWidth={2} opacity={0.35}
                  >
                    <animate attributeName="opacity" values="0.35;0.7;0.35" dur="1.2s" repeatCount="indefinite" />
                  </rect>
                )}

                <rect
                  x={x} y={y} width={NODE_W} height={NODE_H} rx={7}
                  fill={col.fill} stroke={col.stroke} strokeWidth={isAnim ? 1.5 : 1}
                />

                {/* Label */}
                <text
                  x={cx(i)} y={y + 20} textAnchor="middle" fontSize={9.5}
                  fill={col.text} fontFamily="system-ui,sans-serif" fontWeight="600"
                >
                  {n.label.length > 20 ? n.label.slice(0, 20) + '…' : n.label}
                </text>

                {/* LLM call count */}
                {n.llmCalls > 0 && (
                  <text
                    x={cx(i)} y={y + 34} textAnchor="middle" fontSize={8}
                    fill={col.text} opacity={0.7} fontFamily="system-ui,sans-serif"
                  >
                    {n.llmCalls} LLM call{n.llmCalls > 1 ? 's' : ''}
                  </text>
                )}

                {/* Status dot */}
                {n.status !== 'pending' && (
                  <circle cx={x + NODE_W - 10} cy={y + 10} r={4} fill={col.stroke} />
                )}

                {/* Tool chips (generic — whatever tools this node used) */}
                {shownTools.map((t, ti) => {
                  const chipColor = t.error ? '#ff453a' : '#8e8e93';
                  return (
                    <text
                      key={t.name}
                      x={cx(i)} y={y + NODE_H + 12 + ti * 11}
                      textAnchor="middle" fontSize={7.5}
                      fill={chipColor} fontFamily="system-ui,sans-serif" fontWeight="600"
                    >
                      {t.error ? '⚠ ' : ''}{shortToolName(t.name)}
                    </text>
                  );
                })}
                {extraTools > 0 && (
                  <text
                    x={cx(i)} y={y + NODE_H + 12 + shownTools.length * 11}
                    textAnchor="middle" fontSize={7} fill="#6b6b6b" fontFamily="system-ui,sans-serif"
                  >
                    +{extraTools} more
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
