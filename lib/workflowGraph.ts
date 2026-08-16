/**
 * Derive a workflow DAG (nodes + edges + live status) purely from data the
 * Agent Studio contract already provides — no custom /api/workflow/graph endpoint.
 *
 *   Topology  ← GET /api/workflow  (tasks, agents, crew_ai_workflow_metadata order)
 *   Status    ← the event stream   (task_started / task_completed / crew_kickoff_*)
 *   Tools     ← tool_usage_* events, attributed to the running task (sequential)
 *
 * Works for ANY workflow — labels come from the agent names, tool chips come from
 * whatever tools the run actually used (guardrails, MCP servers, retrievers, …).
 */
import { WorkflowEvent, NodeStatus } from './types';

export interface NodeTool {
  name: string;
  error: boolean;
}

export interface DerivedNode {
  id: string;            // task_id
  label: string;         // prettified agent name (fallback: task desc)
  status: NodeStatus;
  tools: NodeTool[];     // distinct tools this node used, in first-seen order
  llmCalls: number;
}

export interface DerivedGraph {
  nodes: DerivedNode[];
  edges: { source: string; target: string }[];
}

// The runtime /api/workflow payload is looser than our TS WorkflowConfig type,
// so read the fields we need defensively.
type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Loose) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** "alert_triage" → "Alert Triage"; leaves non-snake labels as-is. */
function prettify(name: string): string {
  if (!name) return '';
  if (!/[_-]/.test(name) && /\s/.test(name)) return name; // already spaced
  return name
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Short chip label for a tool: drop a trailing "-tool"/"_tool", truncate. */
export function shortToolName(name: string): string {
  const n = name.replace(/[-_]?tool$/i, '');
  return n.length > 16 ? n.slice(0, 15) + '…' : n;
}

/** Build the static topology (all nodes pending) from the workflow config. */
export function buildGraph(workflowData: unknown): DerivedGraph {
  const wf = obj(workflowData);
  const tasks = arr(wf.tasks).map(obj);
  const agents = arr(wf.agents).map(obj);
  const meta = obj(obj(wf.workflow).crew_ai_workflow_metadata);

  const tasksById = new Map<string, Loose>();
  for (const t of tasks) tasksById.set(str(t.task_id), t);
  const agentsById = new Map<string, Loose>();
  for (const a of agents) agentsById.set(str(a.id ?? a.agent_id), a);

  // Canonical execution order: crew metadata task_id list, else tasks[] order.
  const orderedIds = arr(meta.task_id).map(String);
  const taskIds = orderedIds.length ? orderedIds : tasks.map((t) => str(t.task_id));

  const nodes: DerivedNode[] = taskIds.map((id, i) => {
    const task = tasksById.get(id) ?? {};
    const agent = agentsById.get(str(task.assigned_agent_id ?? task.agent_id));
    const agentName = agent ? str(agent.name) : '';
    const role = agent ? str(obj(agent.crew_ai_agent_metadata).role) : '';
    const label =
      prettify(agentName) || role || prettify(str(task.name)) ||
      str(task.description).slice(0, 20) || `Step ${i + 1}`;
    return { id, label, status: 'pending', tools: [], llmCalls: 0 };
  });

  // Sequential (default) → linear chain. Other processes: best-effort linear.
  const edges = nodes.slice(1).map((n, i) => ({ source: nodes[i].id, target: n.id }));

  return { nodes, edges };
}

/** Fold the event stream onto the topology to produce live status + tools. */
export function applyEvents(graph: DerivedGraph, events: WorkflowEvent[]): DerivedGraph {
  // Clone nodes so the function stays pure.
  const nodes = graph.nodes.map((n) => ({ ...n, tools: n.tools.map((t) => ({ ...t })) }));
  const byId = new Map<string, DerivedNode>();
  nodes.forEach((n) => byId.set(n.id, n));

  // Sequential process → at most one task runs at a time; attribute tool/llm
  // events to whichever node most recently started and hasn't finished.
  let currentId: string | null = null;

  const addTool = (nodeId: string | null, name: string, error: boolean) => {
    if (!nodeId || !name) return;
    const node = byId.get(nodeId);
    if (!node) return;
    const existing = node.tools.find((t) => t.name === name);
    if (existing) existing.error = existing.error || error;
    else node.tools.push({ name, error });
  };

  for (const e of events) {
    const id = e.agent_studio_id ?? '';
    switch (e.type) {
      case 'task_started': {
        const node = byId.get(id);
        if (node && node.status !== 'completed') node.status = 'running';
        currentId = byId.has(id) ? id : currentId;
        break;
      }
      case 'task_completed': {
        const node = byId.get(id);
        if (node) node.status = 'completed';
        if (currentId === id) currentId = null;
        break;
      }
      case 'tool_usage_started':
      case 'tool_usage_finished':
        if (e.tool_name) addTool(currentId, e.tool_name, false);
        break;
      case 'tool_usage_error':
        if (e.tool_name) addTool(currentId, e.tool_name, true);
        break;
      case 'llm_call_started': {
        const node = currentId ? byId.get(currentId) : undefined;
        if (node) node.llmCalls += 1;
        break;
      }
      case 'crew_kickoff_completed':
        // Any node still marked running is done.
        nodes.forEach((n) => { if (n.status === 'running') n.status = 'completed'; });
        break;
      case 'crew_kickoff_failed': {
        const node = currentId ? byId.get(currentId) : undefined;
        if (node) node.status = 'error';
        break;
      }
      default:
        break;
    }
  }

  return { nodes, edges: graph.edges };
}

/** Convenience: build + apply in one call. */
export function deriveGraph(workflowData: unknown, events: WorkflowEvent[]): DerivedGraph {
  return applyEvents(buildGraph(workflowData), events);
}
