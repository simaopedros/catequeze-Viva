import { ArrowDown, ArrowUp, ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { type DailyStatsProps } from "../../../analytics/stats";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import { cn } from "../../../client/utils";

const TotalRevenueCard = ({
  dailyStats,
  weeklyStats,
  isLoading,
}: DailyStatsProps) => {
  const isDeltaPositive = useMemo(() => {
    if (!weeklyStats) return false;
    return weeklyStats[0].totalRevenue - weeklyStats[1]?.totalRevenue > 0;
  }, [weeklyStats]);

  const deltaPercentage = useMemo(() => {
    if (!weeklyStats || weeklyStats.length < 2 || isLoading) return;
    if (
      weeklyStats[1]?.totalRevenue === 0 ||
      weeklyStats[0]?.totalRevenue === 0
    )
      return 0;

    weeklyStats.sort((a, b) => b.id - a.id);

    const percentage =
      ((weeklyStats[0].totalRevenue - weeklyStats[1]?.totalRevenue) /
        weeklyStats[1]?.totalRevenue) *
      100;
    return Math.floor(percentage);
  }, [weeklyStats]);

  return (
    <Card className="rounded-sm border-border/70">
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-[#071A2D]">
          <ShoppingCart className="size-5" />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between">
        <div>
          <h4
            className="text-title-md font-semibold tracking-tight tabular-nums text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            ${dailyStats?.totalRevenue}
          </h4>
          <span className="text-sm font-medium text-muted-foreground">
            Total Revenue
          </span>
        </div>

        <span
          className={cn("flex items-center gap-1 text-sm font-medium", {
            "text-success":
              isDeltaPositive && !isLoading && deltaPercentage !== 0,
            "text-destructive":
              !isDeltaPositive && !isLoading && deltaPercentage !== 0,
            "text-muted-foreground":
              isLoading || !deltaPercentage || deltaPercentage === 0,
          })}
        >
          {isLoading
            ? "..."
            : deltaPercentage && deltaPercentage !== 0
              ? `${deltaPercentage}%`
              : "-"}
          {!isLoading &&
            deltaPercentage &&
            deltaPercentage !== 0 &&
            (isDeltaPositive ? <ArrowUp /> : <ArrowDown />)}
        </span>
      </CardContent>
    </Card>
  );
};

export default TotalRevenueCard;
