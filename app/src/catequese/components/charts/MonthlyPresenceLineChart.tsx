/**
 * Full-history presence line chart (catechumen pastoral) — recharts chunk.
 */
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyPresenceLinePoint = {
  month: string;
  present?: number;
  late?: number;
  absent?: number;
  frequency?: number;
};

export function MonthlyPresenceLineChart({
  data,
  presentLabel,
  lateLabel,
  absentLabel,
  frequencyLabel,
  variant = "responsive",
}: {
  data: MonthlyPresenceLinePoint[];
  presentLabel: string;
  lateLabel: string;
  absentLabel: string;
  frequencyLabel: string;
  variant?: "responsive" | "print";
}) {
  const chart = (
    <LineChart
      data={data}
      {...(variant === "print" ? { width: 680, height: 240 } : {})}
      margin={{ top: 8, right: 16, left: 0, bottom: 12 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
      <YAxis
        yAxisId="left"
        allowDecimals={false}
        tick={{ fontSize: 10 }}
        width={28}
      />
      <YAxis
        yAxisId="right"
        orientation="right"
        domain={[0, 100]}
        tick={{ fontSize: 10 }}
        width={32}
      />
      <Tooltip />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      <Line
        yAxisId="left"
        type="monotone"
        dataKey="present"
        name={presentLabel}
        stroke="#071A2D"
        strokeWidth={2}
        dot={{ r: 3 }}
      />
      <Line
        yAxisId="left"
        type="monotone"
        dataKey="late"
        name={lateLabel}
        stroke="#D39A2B"
        strokeWidth={2}
        dot={{ r: 3 }}
      />
      <Line
        yAxisId="left"
        type="monotone"
        dataKey="absent"
        name={absentLabel}
        stroke="#b91c1c"
        strokeWidth={2}
        dot={{ r: 3 }}
      />
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="frequency"
        name={frequencyLabel}
        stroke="#64748b"
        strokeDasharray="4 3"
        strokeWidth={2}
        dot={{ r: 3 }}
      />
    </LineChart>
  );

  if (variant === "print") {
    return (
      <div
        style={{
          width: 680,
          height: 240,
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {chart}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      {chart}
    </ResponsiveContainer>
  );
}
