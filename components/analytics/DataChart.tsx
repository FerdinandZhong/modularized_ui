'use client';

/**
 * Render an AnalyticsResult as a chart per chart_hint.
 * Convention: column[0] is the category/x axis; remaining numeric columns are series.
 */
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AnalyticsResult } from '@/lib/types';

// Cloudera light palette — burnt-orange accent first, then indigo/blue/green supports.
const COLORS = ['#e35b1f', '#2b1a6b', '#2f81f7', '#30a46c', '#d4a72c', '#9b59b6', '#e05252'];
const AXIS = { fontSize: 11, fill: '#6b7280' };
const GRID = '#e3e6ea';
const tooltipStyle = { background: '#ffffff', border: '1px solid #e3e6ea', borderRadius: 8, fontSize: 12, color: '#1a1a2e' };

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function DataChart({ result }: { result: AnalyticsResult }) {
  const { columns, rows, chart_hint } = result;
  if (chart_hint === 'table' || columns.length < 2 || rows.length === 0) return null;

  const xKey = columns[0];
  // numeric series = columns after the first that are numeric across all rows
  const series = columns.slice(1).filter((_, i) =>
    rows.every((r) => r[i + 1] === null || r[i + 1] === undefined || !Number.isNaN(Number(r[i + 1]))),
  );
  if (series.length === 0) return null;

  const data = rows.map((r) => {
    const o: Record<string, string | number> = { [xKey]: String(r[0]) };
    columns.slice(1).forEach((c, i) => { o[c] = toNum(r[i + 1]); });
    return o;
  });

  const H = 260;

  if (chart_hint === 'pie') {
    const measure = series[0];
    return (
      <ResponsiveContainer width="100%" height={H}>
        <PieChart>
          <Pie data={data} dataKey={measure} nameKey={xKey} outerRadius={90} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8b97a7' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart_hint === 'line') {
    return (
      <ResponsiveContainer width="100%" height={H}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={AXIS} />
          <YAxis tick={AXIS} />
          <Tooltip contentStyle={tooltipStyle} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#8b97a7' }} />}
          {series.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={AXIS} />
        <YAxis tick={AXIS} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1a1a2e0d" }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#8b97a7' }} />}
        {series.map((s, i) => (
          <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
