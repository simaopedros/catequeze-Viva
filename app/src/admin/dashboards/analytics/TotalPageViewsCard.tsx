import { ArrowDown, ArrowUp, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import { cn } from "../../../client/utils";

type PageViewsStats = {
  totalPageViews: number | undefined;
  prevDayViewsChangePercent: string | undefined;
};

const TotalPageViewsCard = ({
  totalPageViews,
  prevDayViewsChangePercent,
}: PageViewsStats) => {
  const prevDayViewsChangePercentValue = parseInt(
    prevDayViewsChangePercent || "",
  );
  const isDeltaPositive = prevDayViewsChangePercentValue > 0;

  return (
    <Card className="rounded-sm border-border/70">
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-brand-ink">
          <Eye className="size-5" />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between">
        <div>
          <h4 className="text-title-md font-semibold tracking-tight tabular-nums text-brand-ink">
            {totalPageViews}
          </h4>
          <span className="text-sm font-medium text-muted-foreground">
            Total page views
          </span>
        </div>

        <span
          className={cn("flex items-center gap-1 text-sm font-medium", {
            "text-success":
              isDeltaPositive &&
              prevDayViewsChangePercent &&
              prevDayViewsChangePercentValue !== 0,
            "text-destructive":
              !isDeltaPositive &&
              prevDayViewsChangePercent &&
              prevDayViewsChangePercentValue !== 0,
            "text-muted-foreground":
              !prevDayViewsChangePercent ||
              prevDayViewsChangePercentValue === 0,
          })}
        >
          {prevDayViewsChangePercent && prevDayViewsChangePercentValue !== 0
            ? `${prevDayViewsChangePercent}%`
            : "-"}
          {prevDayViewsChangePercent &&
            prevDayViewsChangePercentValue !== 0 &&
            (isDeltaPositive ? <ArrowUp /> : <ArrowDown />)}
        </span>
      </CardContent>
    </Card>
  );
};

export default TotalPageViewsCard;
