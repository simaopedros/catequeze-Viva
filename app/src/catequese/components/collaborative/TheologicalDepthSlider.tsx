import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCollaborative } from "./CollaborativeContext";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import { SlidersHorizontal, Loader2 } from "lucide-react";

export function TheologicalDepthSlider() {
  const { t } = useTranslation("collaborative");
  const { depth, adjustDepth, generating } = useCollaborative();
  const depthLabels = [
    t("tools.depth.levels.1"),
    t("tools.depth.levels.2"),
    t("tools.depth.levels.3"),
    t("tools.depth.levels.4"),
    t("tools.depth.levels.5"),
  ];

  return (
    <Card className="space-y-3 border-border/70 bg-white p-4">
      <div>
        <div className="mb-0.5 flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4 text-[#071A2D]" />
          <h3 className="text-sm font-semibold text-[#071A2D]">
            {t("tools.depth.title")}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("tools.depth.description")}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {depthLabels.map((label, i) => (
            <button
              key={label}
              onClick={() => adjustDepth(i + 1)}
              disabled={generating}
              className={`rounded-sm px-2 py-1 text-overline transition-colors ${
                depth === i + 1
                  ? "bg-[#071A2D] font-semibold text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-valuenow={depth}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={t("tools.depth.title")}
          className="relative h-2 cursor-pointer rounded-sm bg-muted focus:outline-none focus:ring-2 focus:ring-[#071A2D]/30"
          onClick={(e) => {
            if (generating) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            const idx = Math.round(pct * 4);
            adjustDepth(Math.max(1, Math.min(5, idx + 1)));
          }}
          onKeyDown={(e) => {
            if (generating) return;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              adjustDepth(Math.min(5, depth + 1));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              adjustDepth(Math.max(1, depth - 1));
            }
          }}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-sm bg-[#071A2D] transition-all duration-200"
            style={{ width: `${((depth - 1) / 4) * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-sm border-2 border-white bg-[#071A2D] shadow-sm transition-all duration-200"
            style={{ left: `calc(${((depth - 1) / 4) * 100}% - 0.5rem)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <Badge className="rounded-sm bg-[#071A2D]/08 text-overline text-[#071A2D]">
            {generating ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            {depthLabels[depth - 1]}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
