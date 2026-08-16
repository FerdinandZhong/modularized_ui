'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Play, RotateCcw, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AttachmentState } from '@/components/chat/ChatInput';
import { InputRenderer } from '@/components/inputs/InputRenderer';
import { ChatView } from '@/components/chat/ChatView';
import { EventTimeline } from '@/components/events/EventTimeline';
import { AgentThinking } from '@/components/events/AgentThinking';
import { WorkflowOutput } from '@/components/output/WorkflowOutput';
import { WorkflowGraph } from '@/components/workflow/WorkflowGraph';
import { useWorkflowStore, getTaskInputNames } from '@/stores/workflowStore';
import { useEventStore } from '@/stores/eventStore';
import { useChatStore } from '@/stores/chatStore';
import { createApiClient } from '@/lib/api';
import { ChatMessage, WorkflowEvent } from '@/lib/types';
import { TERMINAL_EVENT_TYPES, EVENT_POLL_INTERVAL_MS } from '@/lib/constants';

// ── Demo mode ─────────────────────────────────────────────────────────────────

const DEMO_RESPONSES = [
  "I've analyzed the claim and found **three key risk factors**:\n\n1. The policyholder has a history of similar claims in the past 18 months\n2. Submitted documentation has inconsistencies in the dates\n3. Claimed amount exceeds typical range by **340%**",
  "Based on the evidence gathered, I recommend **flagging this claim for manual review**.\n\n> Fraud probability score: **0.78** (threshold: 0.65)\n\nI've prepared a detailed report with supporting documentation.",
  "Workflow completed. Summary:\n\n| Metric | Value |\n|--------|-------|\n| Documents analyzed | 12 |\n| Entities extracted | 34 |\n| Risk score | High (0.78) |\n| Recommended action | Manual review |\n\nWould you like me to generate the full investigation report?",
  "Report generated successfully. The investigation file has been saved and is ready for the compliance team's review.",
];

function makeDemoEvents(now: string): WorkflowEvent[] {
  const t = (ms: number) => new Date(Date.now() + ms).toISOString();
  return [
    { type: 'agent_execution_started',   timestamp: t(200),  agent_name: 'Research Agent' },
    { type: 'llm_call_started',           timestamp: t(400),  model: 'claude-opus-4-7' },
    { type: 'tool_usage_started',         timestamp: t(600),  tool_name: 'document_analysis' },
    { type: 'tool_usage_finished',        timestamp: t(900),  tool_name: 'document_analysis' },
    { type: 'llm_call_completed',         timestamp: t(1100), model: 'claude-opus-4-7' },
    { type: 'agent_execution_completed',  timestamp: t(1200), agent_name: 'Research Agent' },
    { type: 'crew_kickoff_completed',     timestamp: t(1400) },
  ];
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WorkflowShell() {
  const { workflowData, workflowUrl, apiKey, inputs, sessionId, resetInputs } = useWorkflowStore();
  const { traceId, events, isRunning, crewOutput, startExecution, addEvents, stopExecution, reset: resetEvents } = useEventStore();
  const { messages, addMessage, clearMessages } = useChatStore();

  const [showReasoning, setShowReasoning] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoIndexRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Real mode polling ────────────────────────────────────────────────────────
  const startPolling = useCallback(
    (traceId: string) => {
      const client = createApiClient({ workflowUrl, apiKey });

      pollRef.current = setInterval(async () => {
        try {
          // API returns only new (delta) events each call — add them all directly
          const { events: fresh } = await client.getEvents(traceId);
          if (fresh.length === 0) return;

          addEvents(fresh);

          const terminal = fresh.find((e) => TERMINAL_EVENT_TYPES.includes(e.type));
          if (terminal) {
            stopPolling();
            const output = terminal.output ?? terminal.result;
            const error = terminal.type === 'crew_kickoff_failed' ? (terminal.error ?? 'Workflow failed') : undefined;
            stopExecution(output, error);
          }
        } catch {
          // transient errors — keep polling
        }
      }, EVENT_POLL_INTERVAL_MS);
    },
    [workflowUrl, apiKey, addEvents, stopExecution, stopPolling],
  );

  // ── Demo mode execution ──────────────────────────────────────────────────────
  const runDemoExecution = useCallback(
    (responseText: string) => {
      const now = new Date().toISOString();
      const demoEvents = makeDemoEvents(now);
      startExecution('demo');

      demoEvents.forEach((event, i) => {
        setTimeout(() => {
          addEvents([event]);
          if (event.type === 'crew_kickoff_completed') {
            stopExecution(responseText);
          }
        }, 300 + i * 200);
      });
    },
    [startExecution, addEvents, stopExecution],
  );

  // ── Demo chat send ───────────────────────────────────────────────────────────
  const handleDemoSend = useCallback(
    (content: string, attachment?: AttachmentState) => {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
        attachmentName: attachment?.name,
        attachmentPath: attachment?.path,
      };
      addMessage(userMsg);

      const response = DEMO_RESPONSES[demoIndexRef.current % DEMO_RESPONSES.length];
      demoIndexRef.current++;

      setTimeout(() => {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        addMessage(assistantMsg);
        runDemoExecution(response);
      }, 1500);
    },
    [addMessage, runDemoExecution],
  );

  // ── Real conversational send ─────────────────────────────────────────────────
  const handleConversationalSend = useCallback(
    async (content: string, attachment?: AttachmentState) => {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
        attachmentName: attachment?.name,
        attachmentPath: attachment?.path,
      };
      addMessage(userMsg);
      resetEvents();

      const client = createApiClient({ workflowUrl, apiKey });
      const context = JSON.stringify(
        messages.map((m) => ({ role: m.role, content: m.content })),
      );

      try {
        const { trace_id } = await client.kickoff({
          user_input: content,
          context,
          session_id: sessionId ?? undefined,
          ...(attachment ? { inputs: { Attachments: attachment.path } } : {}),
        });
        startExecution(trace_id);
        startPolling(trace_id);

        // Watch for crewOutput to post assistant message
        const checkOutput = setInterval(() => {
          const { crewOutput: out, isRunning: running } = useEventStore.getState();
          if (!running && out !== null) {
            clearInterval(checkOutput);
            addMessage({
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: out,
              timestamp: new Date(),
            });
          }
        }, 500);
      } catch (err) {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Kickoff failed'}`,
          timestamp: new Date(),
        });
      }
    },
    [addMessage, messages, workflowUrl, apiKey, sessionId, resetEvents, startExecution, startPolling],
  );

  // ── Structured run ───────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!workflowData) return;
    resetEvents();

    const client = createApiClient({ workflowUrl, apiKey });
    try {
      const { trace_id } = await client.kickoff({
        inputs,
        session_id: sessionId ?? undefined,
      });
      startExecution(trace_id);
      startPolling(trace_id);
    } catch (err) {
      stopExecution(undefined, err instanceof Error ? err.message : 'Kickoff failed');
    }
  }, [workflowData, workflowUrl, apiKey, inputs, sessionId, resetEvents, startExecution, startPolling, stopExecution]);

  const handleReset = useCallback(() => {
    stopPolling();
    resetEvents();
    resetInputs();
    clearMessages();
    demoIndexRef.current = 0;
  }, [stopPolling, resetEvents, resetInputs, clearMessages]);

  // ── Derived state ────────────────────────────────────────────────────────────
  const isDemoMode = !workflowData;
  const isConversational = workflowData?.workflow.is_conversational ?? true;
  const inputNames = workflowData ? getTaskInputNames(workflowData) : [];
  const workflowName = workflowData?.workflow.name ?? 'Agent Workflow';
  const isChatLoading = isRunning && isConversational;

  const chatMessages = messages.length > 0 ? messages : isDemoMode
    ? [{
        id: 'welcome',
        role: 'assistant' as const,
        content: 'Hello! I\'m your Agent Workflow assistant. Send me a message to start.',
        timestamp: new Date(),
      }]
    : [];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

      {/* ── Left panel ── */}
      <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.06] h-[55vh] lg:h-auto lg:w-[40%]">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 shrink-0">
          <div className="min-w-0">
            <p className="text-caption-bold text-white truncate">{workflowName}</p>
            {isDemoMode && (
              <p className="text-nano text-white/30">Demo mode — connect a real workflow to get started</p>
            )}
          </div>
          <button
            onClick={handleReset}
            className="ml-3 text-white/25 hover:text-white/60 transition-colors cursor-pointer"
            title="Reset"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {isConversational || isDemoMode ? (
          <ChatView
            messages={chatMessages}
            onSend={isDemoMode ? handleDemoSend : handleConversationalSend}
            isLoading={isChatLoading}
          />
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {inputNames.length === 0 ? (
                <p className="text-caption text-white/30">No inputs defined for this workflow.</p>
              ) : (
                <InputRenderer inputNames={inputNames} />
              )}
            </div>
            <div className="shrink-0 border-t border-white/[0.06] px-5 py-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleRun}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play size={14} className="mr-2" />
                    Run Workflow
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col bg-surface-dark-5 overflow-hidden">
        {/* DAG graph — derived client-side from the workflow config + event stream
            (no backend graph endpoint needed). Shown once a run has produced events. */}
        {!isDemoMode && (events.length > 0 || isRunning) && <WorkflowGraph />}
        {crewOutput ? (() => {
          const thinkingCount = events.filter(e => e.type === 'llm_call_completed' && e.response).length;
          return (
            <div className="relative flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <WorkflowOutput output={crewOutput} workflowUrl={workflowUrl} apiKey={apiKey} />
              </div>
              {thinkingCount > 0 && (
                <div
                  className={`absolute bottom-0 left-0 right-0 bg-surface-dark-5 border-t border-white/[0.06] overflow-hidden transition-[height] duration-250 ease-in-out ${showReasoning ? 'h-full' : 'h-10'}`}
                >
                  <button
                    onClick={() => setShowReasoning(v => !v)}
                    className="flex items-center justify-between w-full px-5 h-10 text-white/30 hover:text-white/60 transition-colors shrink-0"
                  >
                    <div className="flex items-center gap-2">
                      <Brain size={13} />
                      <span className="text-micro font-medium tracking-wider uppercase">
                        Reasoning · {thinkingCount} {thinkingCount === 1 ? 'step' : 'steps'}
                      </span>
                    </div>
                    {showReasoning ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  <div className="h-[calc(100%-2.5rem)] overflow-hidden">
                    <AgentThinking events={events} isRunning={false} hideHeader />
                  </div>
                </div>
              )}
            </div>
          );
        })() : isRunning ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="h-[40%] shrink-0 border-b border-white/[0.06] overflow-hidden">
              <EventTimeline events={events} isRunning={isRunning} />
            </div>
            <div className="flex-1 overflow-hidden">
              <AgentThinking events={events} isRunning={isRunning} />
            </div>
          </div>
        ) : (
          <EventTimeline events={events} isRunning={isRunning} />
        )}
      </div>

    </div>
  );
}
