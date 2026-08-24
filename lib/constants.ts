import { WorkflowEventType } from './types';

export const TERMINAL_EVENT_TYPES: WorkflowEventType[] = [
  'crew_kickoff_completed',
  'crew_kickoff_failed',
];

export const EVENT_POLL_INTERVAL_MS = 5000;

export const FILE_UPLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB chunks

// Human-readable labels per event type
export const EVENT_LABELS: Record<WorkflowEventType, string> = {
  task_started: 'Task started',
  task_completed: 'Task completed',
  agent_execution_started: 'Agent started',
  agent_execution_completed: 'Agent completed',
  agent_execution_error: 'Agent error',
  tool_usage_started: 'Using tool',
  tool_usage_finished: 'Tool finished',
  tool_usage_error: 'Tool error',
  llm_call_started: 'Calling LLM',
  llm_call_completed: 'LLM responded',
  llm_call_failed: 'LLM failed',
  mcp_initialization_started: 'Initializing MCP',
  mcp_initialization_completed: 'MCP ready',
  crew_kickoff_completed: 'Workflow complete',
  crew_kickoff_failed: 'Workflow failed',
};

// Event category for color/icon grouping
export type EventCategory = 'task' | 'agent' | 'tool' | 'llm' | 'terminal';

export const EVENT_CATEGORIES: Record<WorkflowEventType, EventCategory> = {
  task_started: 'task',
  task_completed: 'task',
  agent_execution_started: 'agent',
  agent_execution_completed: 'agent',
  agent_execution_error: 'agent',
  tool_usage_started: 'tool',
  tool_usage_finished: 'tool',
  tool_usage_error: 'tool',
  llm_call_started: 'llm',
  llm_call_completed: 'llm',
  llm_call_failed: 'llm',
  mcp_initialization_started: 'tool',
  mcp_initialization_completed: 'tool',
  crew_kickoff_completed: 'terminal',
  crew_kickoff_failed: 'terminal',
};
