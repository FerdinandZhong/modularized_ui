'use client';

/**
 * NL→Dashboard — Demo 1 (Advanced NL-to-SQL on Agent Studio 3.0).
 * Cloudera Applied-ML-Prototype aesthetic: light canvas, indigo branded header,
 * single burnt-orange accent. The deployed AS workflow is the sole backend.
 */
import { useRef, useState } from 'react';
import { Send, Loader2, ShieldCheck, Database, Circle } from 'lucide-react';
import { ResultPanel } from '@/components/analytics/ResultPanel';
import { useWorkflowStore } from '@/stores/workflowStore';
import { createApiClient } from '@/lib/api';
import { AnalyticsPanel, WorkflowEvent } from '@/lib/types';
import {
  extractResultFromEvents, isCompleted, isFailed, blockedEvent, blockReason,
} from '@/lib/analytics';

const POLL_MS = 1500;
const MAX_POLLS = 120;

const SAMPLES = [
  'Average module temperature per cell lot last week',
  'Top 5 machines by voltage_std anomalies this month',
  'Daily quality-event count trend for PACK-07',
];

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="mb-2 h-[3px] w-7 rounded-full bg-[#e35b1f]" />
      <h2 className="text-lg font-semibold text-[#1a1a2e]">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-[#6b7280]">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { workflowUrl, apiKey, isConnected, workflowData, connect, isConnecting, connectError } = useWorkflowStore();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [question, setQuestion] = useState('');
  const [panels, setPanels] = useState<AnalyticsPanel[]>([]);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<{ id: string; events: WorkflowEvent[] } | null>(null);
  const idRef = useRef(0);

  const update = (id: string, patch: Partial<AnalyticsPanel>) =>
    setPanels((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function ask(q0?: string) {
    const q = (q0 ?? question).trim();
    if (!q || busy) return;
    setBusy(true);
    setQuestion('');
    const id = `p${++idRef.current}`;
    setPanels((ps) => [{ id, question: q, status: 'running' }, ...ps]);
    setLive({ id, events: [] });

    const client = createApiClient({ workflowUrl, apiKey });
    try {
      const { trace_id } = await client.kickoff({ inputs: { question: q } });
      const events: WorkflowEvent[] = [];
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const { events: fresh } = await client.getEvents(trace_id);
        if (fresh?.length) {
          events.push(...fresh);
          setLive({ id, events: [...events] });
        }
        const blocked = blockedEvent(events);
        if (blocked) { update(id, { status: 'blocked', message: blockReason(blocked) }); break; }
        if (isFailed(events)) { update(id, { status: 'error', message: 'Workflow failed. See Ops / Phoenix for details.' }); break; }
        if (isCompleted(events)) {
          const result = extractResultFromEvents(events);
          update(id, result ? { status: 'done', result } : { status: 'error', message: 'Finished but returned no structured result JSON.' });
          break;
        }
        if (i === MAX_POLLS - 1) update(id, { status: 'error', message: 'Timed out waiting for the workflow.' });
      }
    } catch (err) {
      update(id, { status: 'error', message: err instanceof Error ? err.message : 'Request failed.' });
    } finally {
      setLive(null);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f5f7] font-sans text-[#1a1a2e]">
      {/* Branded header */}
      <header className="bg-[#1c0f43] border-b-[3px] border-[#e35b1f]">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-6 py-4">
          <span className="text-lg font-bold tracking-[0.14em] text-white">CLOUDERA</span>
          <span className="hidden h-8 w-px bg-white/15 sm:block" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white">NL Analytics</p>
            <p className="text-xs text-white/55">Ask in plain language · Agent Studio 3.0 workflow</p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-white/70">
              <Circle size={8} className={isConnected ? 'fill-emerald-400 text-emerald-400' : 'fill-white/30 text-white/30'} />
              {isConnected ? (workflowData?.workflow.name ?? 'Connected') : 'Backend offline'}
            </span>
            <span className="flex items-center gap-1.5 text-white/70">
              <ShieldCheck size={13} className="text-[#e35b1f]" /> Guardrails on
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-6 py-8">
        {!isConnected ? (
          /* Light connect card */
          <div className="mx-auto max-w-md rounded-xl border border-[#e3e6ea] bg-white p-6 shadow-[0_1px_3px_rgba(20,20,50,0.06)]">
            <SectionHead title="Connect workflow" sub="Point at the deployed Advanced NL-to-SQL workflow." />
            <div className="space-y-3">
              <Field label="Workflow URL">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://workflow-….cloudera.site"
                  className="w-full rounded-lg border border-[#d5d9e0] bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[#e35b1f]" />
              </Field>
              <Field label="API key">
                <input value={key} onChange={(e) => setKey(e.target.value)} type="password" placeholder="CDSW_APIV2_KEY"
                  className="w-full rounded-lg border border-[#d5d9e0] bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[#e35b1f]" />
              </Field>
              {connectError && <p className="text-sm text-red-600">{connectError}</p>}
              <button onClick={() => connect(url.trim(), key.trim())} disabled={isConnecting || !url.trim() || !key.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e35b1f] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c94e18] disabled:opacity-40">
                {isConnecting ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
                Connect
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Ask */}
            <section className="mb-8">
              <SectionHead title="Ask a question" sub="Plain-language questions become governed SQL, then a live chart." />
              <div className="rounded-xl border border-[#e3e6ea] bg-white p-3 shadow-[0_1px_3px_rgba(20,20,50,0.06)]">
                <div className="flex items-center gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && ask()}
                    placeholder="e.g. average module temperature per cell lot last week"
                    className="flex-1 bg-transparent px-2 py-2 text-sm text-[#1a1a2e] placeholder-[#9aa1ac] outline-none"
                  />
                  <button onClick={() => ask()} disabled={busy || !question.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#e35b1f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c94e18] disabled:opacity-40">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Run
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                  {SAMPLES.map((s) => (
                    <button key={s} onClick={() => ask(s)} disabled={busy}
                      className="rounded-full border border-[#e3e6ea] bg-[#f7f8fa] px-2.5 py-1 text-xs text-[#6b7280] transition-colors hover:border-[#e35b1f] hover:text-[#1a1a2e] disabled:opacity-40">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Dashboard */}
            <section>
              <SectionHead title="Dashboard" sub="Each answer becomes a panel — chart, table, and the generated SQL." />
              {panels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d5d9e0] bg-white/50 py-16 text-center text-sm text-[#9aa1ac]">
                  Ask a question to build your dashboard.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {panels.map((p) => (
                    <ResultPanel
                      key={p.id}
                      panel={p}
                      workflowData={workflowData}
                      events={live?.id === p.id ? live.events : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#6b7280]">{label}</span>
      {children}
    </label>
  );
}
