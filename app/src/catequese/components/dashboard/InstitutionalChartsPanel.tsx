/**
 * Institutional dashboard recharts — separate async chunk.
 */
import { useTranslation } from "react-i18next";
import { ChartCard } from "../../../client/components/ChartCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export function InstitutionalChartsPanel({
  trendChartData,
  funnelData,
  enrollmentsKey,
  dropoutsKey,
  attendanceKey,
  milestonesKey,
}: {
  trendChartData: Record<string, unknown>[];
  funnelData: { value: number; fill: string; name?: string }[];
  enrollmentsKey: string;
  dropoutsKey: string;
  attendanceKey: string;
  milestonesKey: string;
}) {
  const { t } = useTranslation("dashboard");

  if (!trendChartData.length) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title={t("chart_enrollments_vs_dropouts")}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendChartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted-foreground/20"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={enrollmentsKey}
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={dropoutsKey}
              stroke="#b91c1c"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("chart_attendance_trend")}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendChartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted-foreground/20"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={[0, 100]}
              className="text-muted-foreground"
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={attendanceKey}
              stroke="#071A2D"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {funnelData.length > 0 && (
        <ChartCard title={t("chart_sacramental_funnel")}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={funnelData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title={t("chart_milestones_completed")}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendChartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted-foreground/20"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip />
            <Bar
              dataKey={milestonesKey}
              fill="#a855f7"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
