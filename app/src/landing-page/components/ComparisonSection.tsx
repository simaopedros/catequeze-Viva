import { Check, X, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { Button } from "../../client/components/ui/button";
import { useLandingText } from "../hooks/useLandingText";

type ComparisonRow = {
  criterion: string;
  old: string;
  next: string;
};

/**
 * Side-by-side comparison: paper/spreadsheet/WhatsApp vs Catequese Viva.
 */
export function ComparisonSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const rows = tr("comparison.rows", { returnObjects: true });
  const rowList = Array.isArray(rows) ? (rows as ComparisonRow[]) : [];

  if (rowList.length === 0) return null;

  return (
    <section className="border-y bg-muted/20">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
        <div
          ref={headerRef}
          className={`text-center mb-10 space-y-3 ${headerClass}`}
        >
          <h2
            className="text-3xl font-semibold tracking-tight text-[#071A2D] sm:text-4xl"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {tr("comparison.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {tr("comparison.subtitle")}
          </p>
        </div>

        <div className="overflow-x-auto rounded-sm border bg-card shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 font-semibold text-muted-foreground w-[28%]">
                  {tr("comparison.col_criterion")}
                </th>
                <th className="px-4 py-3 font-semibold text-muted-foreground w-[36%]">
                  {tr("comparison.col_old")}
                </th>
                <th className="px-4 py-3 font-semibold text-[#071A2D] w-[36%]">
                  {tr("comparison.col_next")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rowList.map((row, index) => (
                <ComparisonRowItem
                  key={row.criterion}
                  row={row}
                  delay={index * 40}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button size="lg" variant="brand" asChild>
            <Link
              to="/signup"
              onClick={() =>
                trackMarketingEvent("primary_cta_clicked", {
                  landing: ns,
                  placement: "comparison",
                  destination: "/signup",
                })
              }
            >
              {tr("comparison.cta")}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            {tr("comparison.helper")}
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonRowItem({
  row,
  delay,
}: {
  row: ComparisonRow;
  delay: number;
}) {
  const { ref, className } = useScrollReveal({ delay });
  return (
    <tr ref={ref as any} className={`border-b last:border-0 ${className}`}>
      <td className="px-4 py-3.5 font-medium align-top">{row.criterion}</td>
      <td className="px-4 py-3.5 align-top text-muted-foreground">
        <span className="inline-flex items-start gap-2">
          <X
            className="h-4 w-4 text-destructive/70 shrink-0 mt-0.5"
            aria-hidden
          />
          <span>{row.old}</span>
        </span>
      </td>
      <td className="px-4 py-3.5 align-top">
        <span className="inline-flex items-start gap-2">
          <Check
            className="h-4 w-4 text-[#071A2D] shrink-0 mt-0.5"
            aria-hidden
          />
          <span>{row.next}</span>
        </span>
      </td>
    </tr>
  );
}
