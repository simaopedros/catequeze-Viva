/**
 * Full-history presence line chart (catechumen pastoral) — recharts chunk.
 */
import {
  CartesianGrid,
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
};

export function MonthlyPresenceLineChart({
  data,
  presentLabel,
  variant = "responsive",
}: {
  data: MonthlyPresenceLinePoint[];
  presentLabel: string;
  variant?: "responsive" | "print";
}) {
  const chart = (
    <LineChart
      data={data}
      {...(variant === "print" ? { width: 680, height: 240 } : {})}
      margin={{ top: 8, right: 12, left: 0, bottom: 12 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
      <Tooltip />
      <Line
        type="monotone"
        dataKey="present"
        name={presentLabel}
        stroke="#071A2D"
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
