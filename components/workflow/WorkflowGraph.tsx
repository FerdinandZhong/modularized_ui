'use client';

/**
 * WorkflowGraph — live DAG panel for the anti-hallucination QA workflow.
 *
 * Renders the 5-node linear pipeline as an SVG diagram. Polls
 * GET /api/workflow/graph every 2s while running; on completion keeps the
 * final state.  No new deps — pure SVG + Tailwind.
 */

import { useEffect, useRef, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { createApiClient } from '@/lib/api';
import { GraphNode, GraphResponse } from '@/lib/types';

interface WorkflowGraphProps {
  traceId: string;
  workflowUrl: string;
  apiKey: string;
  isRunning: boolean;
}

// ── Status → color mapping (Tailwind classes) ──────────────────────────────────
const STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  pending:   { fill: '#1c1c1e', stroke: '#3a3a3c', text: '#6b6b6b' },
  running:   { fill: '#0a2540', stroke: '#2997ff', text: '#2997ff' },
  completed: { fill: '#0a2e1a', stroke: '#30d158', text: '#30d158' },
  abstained: { fill: '#2d1b00', stroke: '#ff9f0a', text: '#ff9f0a' },
  error:     { fill: '#2d0a0a', stroke: '#ff453a', text: '#ff453a' },
};

const DEFAULT_COLOR = STATUS_COLORS.pending;

function nodeColor(n: GraphNode) {
  return STATUS_COLORS[n.status ?? 'pending'] ?? DEFAULT_COLOR;
}

// ── Guardrail badge colors ─────────────────────────────────────────────────────
const GUARDRAIL_BADGE: Record<string, string> = {
  G1: '#bf5af2',
  G2: '#2997ff',
  G4: '#ff9f0a',
  ontology: '#30d158',
};

// ── Layout constants ───────────────────────────────────────────────────────────
const NODE_W = 120;
const NODE_H = 52;
const H_GAP  = 32;   // horizontal gap between nodes
const ARROW  = 8;
const SVG_H  = 110;

export function WorkflowGraph({ traceId, workflowUrl, apiKey, isRunning }: WorkflowGraphProps) {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!traceId || !workflowUrl || !apiKey) return;

    const client = createApiClient({ workflowUrl, apiKey });

    const fetch = async () => {
      try {
        const g = await client.getGraph(traceId);
        setGraph(g);
      } catch {
        // transient — keep polling
      }
    };

    fetch();
    pollRef.current = setInterval(fetch, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [traceId, workflowUrl, apiKey]);

  // Stop polling once run is done (and we have data)
  useEffect(() => {
    if (!isRunning && graph && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [isRunning, graph]);

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];

  // Build id→index map for edge routing
  const idxById: Record<string, number> = {};
  nodes.forEach((n, i) => { idxById[n.id] = i; });

  const nodeCount = nodes.length;
  const totalW    = nodeCount * NODE_W + (nodeCount - 1) * H_GAP;
  const svgW      = totalW + 40; // padding

  // x-center of node i
  const cx = (i: number) => 20 + i * (NODE_W + H_GAP) + NODE_W / 2;
  const cy = SVG_H / 2;

  return (
    <div className="flex flex-col border-b border-white/[0.06]" style={{ minHeight: SVG_H + 36 }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-2 shrink-0">
        <GitBranch size={12} className={isRunning ? 'text-apple-bright-blue animate-pulse' : 'text-white/30'} />
        <span className="text-micro font-medium tracking-wider uppercase text-white/40">
          Workflow Graph
        </span>
        {graph && (
          <span className="ml-auto text-nano text-white/20">
            {nodes.filter(n => n.status === 'completed' || n.status === 'abstained').length}/{nodes.length} done
          </span>
        )}
      </div>

      {/* SVG DAG */}
      <div className="overflow-x-auto px-2 py-2">
        {nodes.length === 0 ? (
          <p className="text-nano text-white/20 py-6 text-center">Waiting for graph data…</p>
        ) : (
          <svg
            viewBox={`0 0 ${svgW} ${SVG_H}`}
            width="100%"
            style={{ maxHeight: SVG_H, minWidth: totalW + 40 }}
          >
            {/* Edges (arrows) */}
            {edges.map((e) => {
              const si = idxById[e.source];
              const ti = idxById[e.target];
              if (si === undefined || ti === undefined) return null;
              const x1 = cx(si) + NODE_W / 2;
              const x2 = cx(ti) - NODE_W / 2;
              const mid = (x1 + x2) / 2;
              return (
                <g key={`${e.source}-${e.target}`}>
                  <line
                    x1={x1} y1={cy} x2={x2 - ARROW} y2={cy}
                    stroke="#3a3a3c" strokeWidth={1.5}
                  />
                  <polygon
                    points={`${x2},${cy} ${x2 - ARROW},${cy - 4} ${x2 - ARROW},${cy + 4}`}
                    fill="#3a3a3c"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((n, i) => {
              const col  = nodeColor(n);
              const x    = cx(i) - NODE_W / 2;
              const y    = cy - NODE_H / 2;
              const badge = n.guardrail ? GUARDRAIL_BADGE[n.guardrail] : null;
              const isAnim = n.status === 'running';

              return (
                <g key={n.id}>
                  {/* Glow when running */}
                  {isAnim && (
                    <rect
                      x={x - 3} y={y - 3}
                      width={NODE_W + 6} height={NODE_H + 6}
                      rx={9} fill="none"
                      stroke={col.stroke} strokeWidth={2} opacity={0.35}
                    >
                      <animate attributeName="opacity" values="0.35;0.7;0.35" dur="1.2s" repeatCount="indefinite" />
                    </rect>
                  )}

                  {/* Node rect */}
                  <rect
                    x={x} y={y}
                    width={NODE_W} height={NODE_H}
                    rx={7}
                    fill={col.fill}
                    stroke={col.stroke}
                    strokeWidth={isAnim ? 1.5 : 1}
                  />

                  {/* Label (two lines if long) */}
                  <text
                    x={cx(i)} y={y + 18}
                    textAnchor="middle"
                    fontSize={9}
                    fill={col.text}
                    fontFamily="system-ui,sans-serif"
                    fontWeight="600"
                  >
                    {n.label.length > 18 ? n.label.slice(0, 18) + '…' : n.label}
                  </text>

                  {/* Verdict / confidence */}
                  {n.verdict && (
                    <text
                      x={cx(i)} y={y + 30}
                      textAnchor="middle"
                      fontSize={8}
                      fill={col.text} opacity={0.8}
                      fontFamily="system-ui,sans-serif"
                    >
                      {n.verdict}
                      {n.confidence != null ? ` ${Math.round(n.confidence * 100)}%` : ''}
                    </text>
                  )}

                  {/* Status dot */}
                  {n.status && n.status !== 'pending' && (
                    <circle cx={x + NODE_W - 10} cy={y + 10} r={4} fill={col.stroke} />
                  )}

                  {/* Guardrail badge */}
                  {badge && (
                    <g>
                      <rect
                        x={cx(i) - 14} y={y + NODE_H - 1}
                        width={28} height={12}
                        rx={4} fill={badge} opacity={0.15}
                        stroke={badge} strokeWidth={0.8}
                      />
                      <text
                        x={cx(i)} y={y + NODE_H + 9}
                        textAnchor="middle"
                        fontSize={7.5}
                        fill={badge}
                        fontFamily="system-ui,sans-serif"
                        fontWeight="700"
                      >
                        {n.guardrail}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
