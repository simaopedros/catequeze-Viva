/**
 * Recharts panel for ReportsPage "grafico" tab — separate chunk.
 */
import { useTranslation } from "react-i18next";
import { BarChart3, PieChart } from "lucide-react";
import { EmptyState } from "../../client/components/EmptyState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AppPanel } from "../../client/components/brand/AppChrome";

type ChartRow = Record<string, string | number | undefined>;

export function ReportsChartsPanel({
  chartData,
  pieData,
  presentKey,
  absentKey,
}: {
  chartData: ChartRow[];
  pieData: { name: string; value: number; color: string }[];
  presentKey: string;
  absentKey: string;
}) {
  const { t } = useTranslation("reports");

  return (
    <div className="space-y-6">
      <AppPanel className="p-4 sm:p-6" padded={false}>
        <div className="mb-4 space-y-1.5">
          <h3 className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-brand-ink" />
            {t("chart_attendance")}
          </h3>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
        </div>
        {!chartData.length ? (
          <EmptyState icon={BarChart3} title={t("no_chart_data")} compact />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 11 }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: any) => [`${value}%`, t("attendance_label")]}
                labelFormatter={(label: any) => {
                  const item = chartData.find((d) => d.name === label);
                  return (item?.fullName as string) || label;
                }}
              />
              <Bar dataKey={presentKey} fill="#071A2D" radius={[4, 4, 0, 0]} />
              <Bar dataKey={absentKey} fill="#D39A2B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </AppPanel>

      <AppPanel className="p-4 sm:p-6" padded={false}>
        <div className="mb-4 space-y-1.5">
          <h3 className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground">
            <PieChart className="h-3.5 w-3.5 text-brand-ink" />
            {t("chart_distribution")}
          </h3>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
        </div>
        {pieData[0].value + pieData[1].value === 0 ? (
          <EmptyState
            icon={PieChart}
            title={t("no_chart_data")}
            description={t("no_distribution_data")}
            compact
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }: any) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [value, t("records")]} />
              <Legend />
            </RPieChart>
          </ResponsiveContainer>
        )}
      </AppPanel>
    </div>
  );
}
