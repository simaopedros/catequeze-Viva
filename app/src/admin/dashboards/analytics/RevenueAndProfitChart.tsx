import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type DailyStatsProps } from "../../../analytics/stats";

const REVENUE_COLOR = "#D39A2B";
const PROFIT_COLOR = "#071A2D";

type Point = { label: string; revenue: number };

function roundToHundred(value: number, direction: "up" | "down"): number {
  return direction === "up"
    ? Math.ceil(value / 100) * 100
    : Math.floor(value / 100) * 100;
}

const RevenueAndProfitChart = ({ weeklyStats, isLoading }: DailyStatsProps) => {
  const data = useMemo<Point[]>(() => {
    if (!weeklyStats || weeklyStats.length === 0) return [];
    return [...weeklyStats]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((stat) => ({
        // day of week, month and day of month ("Mon Jan 01")
        label: stat.date.toString().split(" ").slice(0, 3).join(" "),
        revenue: stat.totalRevenue,
      }));
  }, [weeklyStats]);

  const domain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 100];
    const values = data.map((d) => d.revenue);
    return [
      roundToHundred(Math.min(...values), "down"),
      Math.max(roundToHundred(Math.max(...values), "up"), 100),
    ];
  }, [data]);

  return (
    <div className="border-border/70 bg-white pt-7.5 sm:px-7.5 col-span-12 rounded-sm border px-5 pb-5 xl:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="flex w-full flex-wrap gap-3 sm:gap-5">
          <div className="min-w-47.5 flex">
            <span className="border-[#071A2D] mr-2 mt-1 flex h-4 w-full max-w-4 items-center justify-center rounded-full border">
              <span className="bg-[#071A2D] block h-2.5 w-full max-w-2.5 rounded-full"></span>
            </span>
            <div className="w-full">
              <p className="text-[#071A2D] font-semibold">Total Profit</p>
              <p className="text-muted-foreground text-sm font-medium">
                Last 7 Days
              </p>
            </div>
          </div>
          <div className="min-w-47.5 flex">
            <span className="mr-2 mt-1 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-[#D39A2B]">
              <span className="block h-2.5 w-full max-w-2.5 rounded-full bg-[#D39A2B]"></span>
            </span>
            <div className="w-full">
              <p className="font-semibold text-[#8A6418]">Total Revenue</p>
              <p className="text-muted-foreground text-sm font-medium">
                Last 7 Days
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        id="chartOne"
        className="-ml-5 mt-4 h-[350px]"
        aria-busy={isLoading || undefined}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.25} />
                <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              width={48}
            />
            <Tooltip
              formatter={(value) => [`${value}`, "Revenue"]}
              contentStyle={{ borderRadius: 4, fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={REVENUE_COLOR}
              strokeWidth={2}
              fill="url(#revenueFill)"
              dot={{ r: 3, stroke: PROFIT_COLOR, strokeWidth: 1, fill: "#fff" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueAndProfitChart;
