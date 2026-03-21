"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MonthlyEntry {
  month: string;
  sorties: number;
  km: number;
}

interface DifficultyEntry {
  name: string;
  value: number;
  color: string;
}

interface StatsChartsProps {
  monthlyData: MonthlyEntry[];
  difficultyData: DifficultyEntry[];
}

const TOOLTIP_STYLE = {
  background: "#1a1d18",
  border: "1px solid #2d3b2a",
  borderRadius: "8px",
  color: "#e8e4dc",
} as const;

export function StatsCharts({ monthlyData, difficultyData }: StatsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Monthly chart */}
      <div className="rounded-2xl border border-peak-border bg-peak-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">
          Activité par mois
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis
                dataKey="month"
                tick={{ fill: "#9a9688", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9a9688", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar
                dataKey="sorties"
                fill="#5a7a52"
                radius={[4, 4, 0, 0]}
                name="Sorties"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Difficulty pie */}
      <div className="rounded-2xl border border-peak-border bg-peak-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">
          Répartition par difficulté
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={difficultyData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                paddingAngle={4}
                label={({ name, value }) => `${name} (${value})`}
              >
                {difficultyData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
