import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, Loader2 } from "lucide-react";
import { createContentItem } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { toast } from "../../../client/hooks/use-toast";
import { useActiveParish } from "../../../client/hooks/useActiveParish";
import { sampleMeetingsFor } from "../../../shared/sampleMeetings";

type ExistingItem = { id: string; title?: string | null };

function normalizeTitle(title?: string | null) {
  return (title || "").trim().toLocaleLowerCase();
}

/** Ready-made meeting scripts a catechist can copy into the library and edit. */
export function SampleMeetingsPanel({
  existingItems = [],
}: {
  existingItems?: ExistingItem[];
}) {
  const { t, i18n } = useTranslation("content");
  const navigate = useNavigate();
  const { activeParishId } = useActiveParish();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const samples = sampleMeetingsFor(i18n.language);
  const copiesByTitle = new Map(
    existingItems.map((item) => [normalizeTitle(item.title), item.id]),
  );

  const copySample = async (id: string) => {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;
    setCreatingId(id);
    try {
      const { id: _sampleId, ...fields } = sample;
      const item = await createContentItem({
        ...fields,
        workspaceId: activeParishId || undefined,
      });
      toast({ title: t("library.samples.created") });
      navigate(`/app/content-library/${item.id}/edit`);
    } catch (e: any) {
      toast({
        title: t("library.samples.error"),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <section className="space-y-4 rounded-sm border border-border/70 bg-white p-6">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          {t("library.samples.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("library.samples.desc")}
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {samples.map((sample) => (
          <li
            key={sample.id}
            className="flex flex-col gap-2 rounded-sm border border-border/70 bg-muted/20 p-4"
          >
            <p className="font-semibold tracking-tight text-brand-ink">
              {sample.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {sample.biblicalRef} · {sample.catechismRef} ·{" "}
              {t("library.samples.minutes", { count: sample.estimatedTime })}
            </p>
            <p className="flex-1 text-sm text-muted-foreground">
              {sample.pastoralObjective}
            </p>
            {copiesByTitle.has(normalizeTitle(sample.title)) ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-10 rounded-sm bg-white"
                asChild
              >
                <Link
                  to={`/app/content-library/${copiesByTitle.get(
                    normalizeTitle(sample.title),
                  )}`}
                >
                  {t("library.samples.open_copy")}
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-10 rounded-sm bg-white"
                disabled={creatingId !== null}
                onClick={() => void copySample(sample.id)}
              >
                {creatingId === sample.id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("library.samples.use")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
