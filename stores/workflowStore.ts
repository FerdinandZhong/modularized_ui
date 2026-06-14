import { create } from 'zustand';
import { WorkflowConfig } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { useChatStore } from './chatStore';

interface WorkflowState {
  workflowUrl: string;
  apiKey: string;
  isConnected: boolean;
  isConnecting: boolean;
  connectError: string | null;
  workflowData: WorkflowConfig | null;
  inputs: Record<string, unknown>;
  sessionId: string | null;
  sessionDirectory: string | null;

  connect: (url: string, apiKey: string) => Promise<boolean>;
  disconnect: () => void;
  setInput: (name: string, value: unknown) => void;
  resetInputs: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowUrl: '',
  apiKey: '',
  isConnected: false,
  isConnecting: false,
  connectError: null,
  workflowData: null,
  inputs: {},
  sessionId: null,
  sessionDirectory: null,

  connect: async (url: string, apiKey: string) => {
    useChatStore.getState().clearMessages();
    set({ isConnecting: true, connectError: null });

    try {
      const client = createApiClient({ workflowUrl: url, apiKey });

      const [workflowData, session] = await Promise.all([
        client.fetchWorkflow(),
        client.createSession(),
      ]);

      // Persist URL (not key) for convenience
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastWorkflowUrl', url);
      }

      set({
        workflowUrl: url,
        apiKey,
        workflowData,
        sessionId: session.session_id,
        sessionDirectory: session.session_directory,
        isConnected: true,
        isConnecting: false,
        inputs: {},
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      set({ isConnecting: false, connectError: message });
      return false;
    }
  },

  disconnect: () => {
    set({
      workflowUrl: '',
      apiKey: '',
      isConnected: false,
      workflowData: null,
      inputs: {},
      sessionId: null,
      sessionDirectory: null,
      connectError: null,
    });
  },

  setInput: (name, value) => {
    set((state) => ({ inputs: { ...state.inputs, [name]: value } }));
  },

  resetInputs: () => {
    set({ inputs: {} });
  },
}));

// Derive all task input names from workflow data
export function getTaskInputNames(workflowData: WorkflowConfig): string[] {
  const names = new Set<string>();
  for (const task of workflowData.tasks) {
    for (const input of task.inputs) {
      names.add(input);
    }
  }
  return Array.from(names);
}
