import { ArrowDown, ArrowUp, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { type DailyStatsProps } from "../../../analytics/stats";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import { cn } from "../../../client/utils";

const TotalPayingUsersCard = ({ dailyStats, isLoading }: DailyStatsProps) => {
  const isDeltaPositive = useMemo(() => {
    return !!dailyStats?.paidUserDelta && dailyStats?.paidUserDelta > 0;
  }, [dailyStats]);

  return (
    <Card className="rounded-sm border-border/70">
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-[#071A2D]">
          <ShoppingBag className="size-5" />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between">
        <div>
          <h4 className="font-brand-display text-title-md font-semibold tracking-tight tabular-nums text-[#071A2D]">
            {dailyStats?.paidUserCount}
          </h4>
          <span className="text-sm font-medium text-muted-foreground">
            Total Paying Users
          </span>
        </div>

        <span
          className={cn("flex items-center gap-1 text-sm font-medium", {
            "text-success": isDeltaPositive && !isLoading,
            "text-destructive":
              !isDeltaPositive && !isLoading && dailyStats?.paidUserDelta !== 0,
            "text-muted-foreground": isLoading || !dailyStats?.paidUserDelta,
          })}
        >
          {isLoading ? "..." : dailyStats?.paidUserDelta ?? "-"}
          {!isLoading &&
            (dailyStats?.paidUserDelta ?? 0) !== 0 &&
            (isDeltaPositive ? <ArrowUp /> : <ArrowDown />)}
        </span>
      </CardContent>
    </Card>
  );
};

export default TotalPayingUsersCard;
