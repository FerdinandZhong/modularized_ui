// Workflow configuration returned by GET /api/workflow
export interface WorkflowConfig {
  workflow: WorkflowMeta;
  agents: AgentMetadata[];
  tasks: TaskMetadata[];
  toolInstances: ToolInstance[];
}

export interface WorkflowMeta {
  workflow_id: string;
  name: string;
  description?: string;
  is_conversational: boolean;
}

export interface AgentMetadata {
  agent_id: string;
  name: string;
  role?: string;
  goal?: string;
}

export interface TaskMetadata {
  task_id: string;
  name: string;
  description?: string;
  inputs: string[];
  agent_id?: string;
}

export interface ToolInstance {
  tool_instance_id: string;
  name: string;
  type: string;
}

// Session
export interface SessionResponse {
  session_id: string;
  session_directory: string;
}

// Kickoff
export interface KickoffRequest {
  inputs?: Record<string, unknown>;
  session_id?: string;
  // conversational mode
  user_input?: string;
  context?: string;
}

export interface KickoffResponse {
  trace_id: string;
}

// Events
export interface WorkflowEvent {
  type: WorkflowEventType;
  timestamp: string;
  agent_studio_id?: string;
  trace_id?: string;
  // agent events
  agent_name?: string;
  agent_role?: string;
  // task events
  task_name?: string;
  task_description?: string;
  // tool events
  tool_name?: string;
  tool_input?: unknown;
  tool_output?: unknown;
  // llm events
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  call_type?: string;
  response?: string;
  messages?: Array<{ role: string; content: string }>;
  // tool events (extended)
  tool_args?: string;
  tool_class?: string;
  // agent_execution_started nested objects
  agent?: { agent_studio_id?: string };
  task?: { name?: string | null; description?: string; expected_output?: string };
  // completion
  output?: string;
  result?: string;
  error?: string;
}

export type WorkflowEventType =
  | 'task_started'
  | 'task_completed'
  | 'agent_execution_started'
  | 'agent_execution_completed'
  | 'agent_execution_error'
  | 'tool_usage_started'
  | 'tool_usage_finished'
  | 'tool_usage_error'
  | 'llm_call_started'
  | 'llm_call_completed'
  | 'llm_call_failed'
  | 'mcp_initialization_started'
  | 'mcp_initialization_completed'
  | 'crew_kickoff_completed'
  | 'crew_kickoff_failed';

export interface EventsResponse {
  events: WorkflowEvent[];
}

// File upload
export interface FileUploadResponse {
  file_path: string;
  file_name: string;
  file_size: number;
}

// Chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachmentName?: string;
  attachmentPath?: string;
}

// API error
export interface ApiError {
  message: string;
  status: number;
}

// Workflow graph (DAG panel) — node status; graph is derived client-side in lib/workflowGraph.ts
export type NodeStatus = 'pending' | 'running' | 'completed' | 'abstained' | 'error';

// NL→Dashboard analytics (Demo 1: NL-to-SQL). The workflow's reporter agent returns this JSON.
export type ChartHint = 'bar' | 'line' | 'pie' | 'table';

export interface AnalyticsResult {
  question: string;
  sql?: string;
  columns: string[];
  rows: (string | number | null)[][];
  chart_hint?: ChartHint;
  summary?: string;
}

export interface AnalyticsPanel {
  id: string;
  question: string;
  status: 'running' | 'done' | 'blocked' | 'error';
  result?: AnalyticsResult;
  message?: string;   // error text or block reason
}
