import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { STRINGS } from "./constants";

interface TeamExcellenceChartProps {
  score: number;
}

export function TeamExcellenceChart({ score }: TeamExcellenceChartProps) {
  return (
    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {STRINGS.TEAM_EXCELLENCE}
          </div>
          <div className="text-2xl font-bold text-blue-900">{score}%</div>
          <div className="text-[10px] text-slate-500">{STRINGS.GOAL_TEXT}</div>
        </div>
        <div className="h-24 w-24">
          <ResponsiveContainer>
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={[{ name: "x", value: score, fill: "#facc15" }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: "#e2e8f0" }} dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
