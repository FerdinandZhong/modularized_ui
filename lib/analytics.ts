/**
 * Parse the NL-to-SQL reporter agent's final output into an AnalyticsResult.
 * The agent returns {question, sql, columns, rows, chart_hint, summary} — possibly
 * wrapped in ```json fences or surrounded by prose. Be tolerant.
 */
import { AnalyticsResult, ChartHint, WorkflowEvent } from './types';

const CHART_HINTS: ChartHint[] = ['bar', 'line', 'pie', 'table'];

function normalize(o: Record<string, unknown>): AnalyticsResult | null {
  if (!Array.isArray(o.columns) || !Array.isArray(o.rows)) return null;
  const hint = typeof o.chart_hint === 'string' && (CHART_HINTS as string[]).includes(o.chart_hint)
    ? (o.chart_hint as ChartHint) : 'table';
  return {
    question: typeof o.question === 'string' ? o.question : '',
    sql: typeof o.sql === 'string' ? o.sql : undefined,
    columns: (o.columns as unknown[]).map(String),
    rows: (o.rows as unknown[]).filter(Array.isArray) as (string | number | null)[][],
    chart_hint: hint,
    summary: typeof o.summary === 'string' ? o.summary : undefined,
  };
}

export function extractResultJson(text: string): AnalyticsResult | null {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : text).trim();

  const tryParse = (s: string): AnalyticsResult | null => {
    try {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      return normalize(parsed);
    } catch {
      return null;
    }
  };

  const direct = tryParse(candidate);
  if (direct) return direct;

  // Fall back to the widest {...} span.
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) return tryParse(candidate.slice(start, end + 1));
  return null;
}

/** The final crew output text from the event stream. */
export function finalOutputText(events: WorkflowEvent[]): string {
  const done = [...events].reverse().find((e) => e.type === 'crew_kickoff_completed');
  return (done?.output as string) ?? (done?.result as string) ?? '';
}

export function isCompleted(events: WorkflowEvent[]): boolean {
  return events.some((e) => e.type === 'crew_kickoff_completed');
}

export function isFailed(events: WorkflowEvent[]): boolean {
  return events.some((e) => e.type === 'crew_kickoff_failed');
}

/** guardrail_blocked is a runtime event type not in the TS union — check by string. */
export function blockedEvent(events: WorkflowEvent[]): WorkflowEvent | undefined {
  return events.find((e) => (e.type as string) === 'guardrail_blocked');
}

export function blockReason(e: WorkflowEvent | undefined): string {
  if (!e) return 'Blocked by a guardrail.';
  const rec = e as unknown as Record<string, unknown>;
  return (
    (typeof rec.reasoning === 'string' && rec.reasoning) ||
    (typeof e.error === 'string' && e.error) ||
    'Blocked — prompt injection / jailbreak detected.'
  );
}
