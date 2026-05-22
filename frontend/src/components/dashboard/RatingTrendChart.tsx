import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { RatingAvgItem } from "../../types";

const BRANCH_COLORS: Record<string, string> = {
  clarity: "#818cf8",
  workload: "#22d3ee",
  assessment: "#a78bfa",
  support: "#34d399",
};

interface Props {
  data: RatingAvgItem[];
}

export default function RatingTrendChart({ data }: Props) {
  // Group by branch, compute per-branch average
  const branchMap = new Map<string, { sum: number; count: number }>();
  for (const r of data) {
    const existing = branchMap.get(r.concern_branch) || { sum: 0, count: 0 };
    existing.sum += parseFloat(r.avg_rating);
    existing.count += 1;
    branchMap.set(r.concern_branch, existing);
  }

  // Build chart points — one per branch, showing the overall avg rating
  const branches = [...branchMap.keys()];
  const chartData = branches.map((b) => {
    const { sum, count } = branchMap.get(b)!;
    return {
      branch:
        b.charAt(0).toUpperCase() + b.slice(1),
      avg: parseFloat((sum / count).toFixed(2)),
    };
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="mb-1 text-base font-semibold text-slate-100">
        Average Satisfaction by Branch
      </h3>
      <p className="mb-5 text-xs text-slate-500">
        Mean rating score (1–5) for rating-type questions
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="branch"
            tick={{ fill: "#cbd5e1", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: "#64748b", fontSize: 11 }}
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
            formatter={(value: any) => [Number(value).toFixed(2), "Avg Rating"]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
          <Line
            type="monotone"
            dataKey="avg"
            name="Rating"
            stroke="#818cf8"
            strokeWidth={2.5}
            dot={{
              fill: "#818cf8",
              r: 5,
              strokeWidth: 2,
              stroke: "#1e293b",
            }}
            activeDot={{ r: 7, fill: "#a5b4fc" }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Per-branch breakdown */}
      <div className="mt-4 flex flex-wrap gap-3">
        {data.map((r) => (
          <div
            key={r.question_id}
            className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs"
          >
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full"
              style={{ background: BRANCH_COLORS[r.concern_branch] || "#818cf8" }}
            />
            <span className="text-slate-400">{r.question_text.slice(0, 40)}…</span>
            <span className="ml-2 font-semibold text-slate-200">
              {parseFloat(r.avg_rating).toFixed(1)}
            </span>
            <span className="ml-1 text-slate-600">
              ({r.response_count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
