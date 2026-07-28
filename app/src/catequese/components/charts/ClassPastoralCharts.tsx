/**
 * Class pastoral report recharts blocks — separate chunk.
 */
import { useTranslation } from "react-i18next";
import { BarChart3, Calendar, PieChart } from "lucide-react";
import { EmptyState } from "../../../client/components/EmptyState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  PieChart as RPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const ATTENDANCE_COLORS = {
  present: "#071A2D",
  late: "#D39A2B",
  justified: "#071A2D",
  absent: "#b91c1c",
};

export function ClassPastoralCharts({
  meetingsBarData,
  monthlyData,
  statusPieData,
  hasMeetings,
}: {
  meetingsBarData: Record<string, unknown>[];
  monthlyData: Record<string, unknown>[];
  statusPieData: { name: string; value: number; color: string }[];
  hasMeetings: boolean;
}) {
  const { t } = useTranslation("pastoralReport");

  if (!hasMeetings) {
    return <EmptyState icon={Calendar} title={t("noMeetings")} compact />;
  }

  return (
    <>
      <div className="rounded-sm border border-border/70 bg-white p-6">
        <div className="mb-4 space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            {t("presencesPerMeeting")}
          </h3>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={meetingsBarData}
            margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar
              dataKey={t("present")}
              stackId="a"
              fill={ATTENDANCE_COLORS.present}
            />
            <Bar
              dataKey={t("late")}
              stackId="a"
              fill={ATTENDANCE_COLORS.late}
            />
            <Bar
              dataKey={t("justified")}
              stackId="a"
              fill={ATTENDANCE_COLORS.justified}
            />
            <Bar
              dataKey={t("absent")}
              stackId="a"
              fill={ATTENDANCE_COLORS.absent}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-sm border border-border/70 bg-white p-6">
        <div className="mb-4 space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            {t("meetingsPerMonth")}
          </h3>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
        </div>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={monthlyData}
              margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                label={{
                  value: t("meetingsCount"),
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10 },
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                label={{
                  value: t("avgAttendanceLine"),
                  angle: 90,
                  position: "insideRight",
                  style: { fontSize: 10 },
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(value: any, name: any) => [value, name]} />
              <Bar
                yAxisId="left"
                dataKey="meetings"
                fill="#071A2D"
                name={t("monthlyMeetings")}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgAttendance"
                stroke="#071A2D"
                name={t("avgAttendanceLine")}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BarChart3} title={t("noData")} compact />
        )}
      </div>

      <div className="rounded-sm border border-border/70 bg-white p-6">
        <div className="mb-4 space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <PieChart className="h-4 w-4" />
            {t("classStatus")}
          </h3>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
        </div>
        {statusPieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <RPieChart>
              <Pie
                data={statusPieData}
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
                {statusPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend formatter={(value) => String(value)} />
            </RPieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={PieChart} title={t("noData")} compact />
        )}
      </div>
    </>
  );
}
