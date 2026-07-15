/**
 * Stacked monthly presence bar chart (catechumen pastoral) — recharts chunk.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function MonthlyPresenceBarChart({
  data,
  presentLabel,
  lateLabel,
  absentLabel,
}: {
  data: { month: string; present?: number; late?: number; absent?: number }[];
  presentLabel: string;
  lateLabel: string;
  absentLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 12, left: 0, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar
          dataKey="present"
          stackId="a"
          fill="#071A2D"
          name={presentLabel}
        />
        <Bar dataKey="late" stackId="a" fill="#D39A2B" name={lateLabel} />
        <Bar dataKey="absent" stackId="a" fill="#b91c1c" name={absentLabel} />
      </BarChart>
    </ResponsiveContainer>
  );
}
