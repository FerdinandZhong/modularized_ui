import {
  WorkflowConfig,
  SessionResponse,
  KickoffRequest,
  KickoffResponse,
  EventsResponse,
  FileUploadResponse,
} from './types';

interface ApiClientConfig {
  workflowUrl: string;
  apiKey: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function proxyFetch<T>(
  path: string,
  config: ApiClientConfig,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Workflow-URL': config.workflowUrl,
      'X-API-Key': config.apiKey,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

async function proxyFetchMultipart<T>(
  path: string,
  config: ApiClientConfig,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, {
    method: 'POST',
    headers: {
      'X-Workflow-URL': config.workflowUrl,
      'X-API-Key': config.apiKey,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

export function createApiClient(config: ApiClientConfig) {
  return {
    fetchWorkflow(): Promise<WorkflowConfig> {
      return proxyFetch('api/workflow', config, { method: 'GET' });
    },

    createSession(): Promise<SessionResponse> {
      return proxyFetch('api/workflow/createSession', config, { method: 'POST', body: '{}' });
    },

    kickoff(payload: KickoffRequest): Promise<KickoffResponse> {
      return proxyFetch('api/workflow/kickoff', config, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getEvents(traceId: string): Promise<EventsResponse> {
      return proxyFetch(`api/workflow/events?trace_id=${encodeURIComponent(traceId)}`, config, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    },

    uploadFile(sessionId: string, file: File): Promise<FileUploadResponse> {
      const formData = new FormData();
      formData.append('file', file);
      return proxyFetchMultipart(
        `api/file/upload?session_id=${encodeURIComponent(sessionId)}`,
        config,
        formData,
      );
    },
  };
}

export { ApiError };
export type ApiClient = ReturnType<typeof createApiClient>;
