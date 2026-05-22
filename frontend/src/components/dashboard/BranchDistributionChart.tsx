import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { BranchDistItem } from "../../types";

const BRANCH_LABELS: Record<string, string> = {
  clarity: "Clarity",
  workload: "Workload",
  assessment: "Assessment",
  support: "Support",
};

const COLORS = ["#818cf8", "#22d3ee", "#a78bfa", "#34d399"];

interface Props {
  data: BranchDistItem[];
}

export default function BranchDistributionChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.session_count, 0) || 1;
  const chartData = data.map((d) => ({
    name: BRANCH_LABELS[d.concern_branch] || d.concern_branch,
    sessions: d.session_count,
    completed: d.completed_count,
    pct: Math.round((d.session_count / total) * 100),
  }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="mb-1 text-base font-semibold text-slate-100">
        Feedback Branch Distribution
      </h3>
      <p className="mb-5 text-xs text-slate-500">
        Percentage of sessions per concern area
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fill: "#cbd5e1", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#f1f5f9" }}
            itemStyle={{ color: "#94a3b8" }}
            formatter={(_value: any, _name: any, props: any) => [
              `${props.payload.pct}%  (${props.payload.sessions} sessions, ${props.payload.completed} completed)`,
              "",
            ]}
          />
          <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {chartData.map((_entry, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
