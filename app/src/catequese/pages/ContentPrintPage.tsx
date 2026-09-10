import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  Printer,
  ArrowLeft,
  Clock,
  BookOpen,
  Church,
  FileText,
} from "lucide-react";
import {
  useQuery,
  getContentItem,
  listActivitiesByContent,
} from "wasp/client/operations";
import { useActivityTypes } from "../../i18n/useLabels";
import {
  parseContentDocument,
  buildLegacyContentDocument,
} from "../../shared/contentDocument";
import { ContentDocumentRenderer } from "../components/content/ContentDocumentRenderer";

function parseData(data: string | null): any {
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function normalizeText(value?: string | null) {
  return value?.trim() || "";
}

function referenceSectionTitle(label: string, count: number) {
  return `${label} (${count})`;
}

export default function ContentPrintPage() {
  const { t } = useTranslation("content");
  const activityTypes = useActivityTypes();
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading } = useQuery(getContentItem, { id: id! });
  const { data: activities = [] } = useQuery(listActivitiesByContent, {
    contentId: id!,
  });

  const statusLabel = (status: string) => {
    const key = `status_${status.toLowerCase()}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center">
        <p className="text-muted-foreground">{t("print_page.loading")}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6 text-center text-destructive">
        {t("print_page.not_found")}
      </div>
    );
  }

  const document =
    parseContentDocument(item.documentJson) || buildLegacyContentDocument(item);
  const bibleRefs = (item.bibleRefs || []).map((ref: any) => ({
    id: ref.id,
    label: `${
      ref.verse?.chapter?.book?.abbreviation ||
      ref.verse?.chapter?.book?.name ||
      "Bíblia"
    } ${ref.verse?.chapter?.number}:${ref.verse?.number}`,
    text: normalizeText(ref.verse?.text),
    book:
      ref.verse?.chapter?.book?.name ||
      ref.verse?.chapter?.book?.abbreviation ||
      "Bíblia",
    chapter: ref.verse?.chapter?.number,
    verse: ref.verse?.number,
  }));
  const catechismRefs = (item.catechismRefs || []).map((ref: any) => ({
    id: ref.id,
    label: `CIC §${ref.entry?.number}`,
    title: normalizeText(ref.entry?.question),
    text: normalizeText(ref.entry?.answer),
  }));
  const directoryRefs = (item.directoryRefs || []).map((ref: any) => ({
    id: ref.id,
    label: `Diretório §${ref.entry?.number}`,
    title: normalizeText(ref.entry?.title || ref.entry?.chapter),
    text: normalizeText(ref.entry?.content),
  }));
  const hasReferences =
    bibleRefs.length > 0 ||
    catechismRefs.length > 0 ||
    directoryRefs.length > 0;

  return (
    <>
      {/*
        Print rules live here + Main.css.
        Avoid visibility:hidden + position:absolute (clips multipage content
        inside AppShell overflow containers).
      */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm 16mm;
          }

          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Unclip AppShell / scroll ancestors */
          body, #root, #root > div, #main-content,
          .overflow-hidden, .overflow-y-auto, .overflow-y-scroll {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            position: static !important;
          }

          /*
            Only hide chrome marked .no-print / data-print-hide.
            Do NOT hide bare <header>/<nav>/<aside> — the print document
            title block is a <header> and was being wiped from the PDF.
          */
          .no-print,
          [data-print-hide="true"] {
            display: none !important;
          }

          /* Explicitly keep document chrome (title, time, theme) */
          #print-content .print-doc-header,
          #print-content [data-print-keep="true"] {
            display: block !important;
            visibility: visible !important;
          }

          #print-root {
            display: block !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #print-paper {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          #print-content {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #071A2D !important;
            background: #fff !important;
          }

          /* Small cards can stay together; large blocks may paginate */
          .print-keep {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-section-title {
            break-after: avoid;
            page-break-after: avoid;
          }

          #print-content h1 {
            font-size: 18pt;
            line-height: 1.25;
          }
          #print-content h2 {
            font-size: 13pt;
            line-height: 1.3;
            margin-top: 1.1em;
          }
          #print-content h3 {
            font-size: 12pt;
          }
          #print-content p,
          #print-content li,
          #print-content td,
          #print-content th {
            font-size: 10.5pt;
            line-height: 1.55;
          }
          #print-content img {
            max-width: 100% !important;
            max-height: 240px !important;
            height: auto !important;
            object-fit: contain !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          #print-content table {
            width: 100% !important;
            break-inside: auto;
          }
          #print-content tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          #print-content a {
            color: inherit !important;
            text-decoration: none !important;
          }
        }
      `}</style>

      {/* On-screen toolbar */}
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-sm"
            asChild
          >
            <Link to={`/app/content-library/${id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("print_page.back")}
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("print_page.preview_hint", {
              defaultValue:
                "Pré-visualização em formato A4. Confira se o texto não está cortado antes de imprimir.",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-sm border border-border/70"
          >
            {statusLabel(item.status)}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-sm border-brand-gold/40 text-micro font-semibold uppercase tracking-wide text-brand-gold-muted"
          >
            {t("print_page.preview_badge", {
              defaultValue: "Pré-impressão A4",
            })}
          </Badge>
          <Button
            onClick={() => window.print()}
            className="h-9 gap-2 rounded-md bg-brand-ink hover:bg-brand-ink-soft"
          >
            <Printer className="h-4 w-4" />
            {t("print_page.print_pdf")}
          </Button>
        </div>
      </div>

      {/* Screen: paper frame. Print: unframed full flow. */}
      <div id="print-root" className="mx-auto max-w-[210mm]">
        <div
          id="print-paper"
          className="rounded-sm border border-border/70 bg-white shadow-[0_8px_30px_rgba(7,26,45,0.08)]"
        >
          <div
            id="print-content"
            className="px-6 py-8 text-brand-ink sm:px-10 sm:py-10"
          >
            <header
              className="print-doc-header print-keep mb-8 border-b border-brand-ink/15 pb-6 text-center"
              data-print-keep="true"
            >
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("print_page.header_badge")}
              </p>
              <h1 className="mb-2 text-2xl font-semibold tracking-tight text-brand-ink sm:text-[1.75rem]">
                {item.title}
              </h1>
              <div
                className="mx-auto mb-3 h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
                aria-hidden
              />
              {item.theme && (
                <p className="mb-3 text-base italic text-muted-foreground sm:text-lg">
                  {item.theme}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {item.estimatedTime && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t("print_page.minutes", { count: item.estimatedTime })}
                  </span>
                )}
                {item.createdBy && (
                  <span>
                    {t("print_page.prepared_by", {
                      name: `${item.createdBy.firstName} ${item.createdBy.lastName}`,
                    })}
                  </span>
                )}
              </div>
            </header>

            {/* Main body — allow page breaks inside long prose */}
            <section className="print-body">
              <ContentDocumentRenderer
                document={document}
                className="prose-neutral prose-img:max-h-[280px]"
              />
            </section>

            {hasReferences && (
              <section className="mt-10 space-y-5">
                <div className="print-section-title border-b border-brand-ink/12 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("print_page.pastoral_support", {
                      defaultValue: "Apoio pastoral",
                    })}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-brand-ink">
                    {t("print_page.linked_references", {
                      defaultValue: "Referências vinculadas",
                    })}
                  </h2>
                  <div className="mt-2 h-px w-16 bg-gradient-to-r from-brand-gold to-transparent" aria-hidden />
                </div>

                {bibleRefs.length > 0 && (
                  <div className="space-y-3">
                    <div className="print-section-title flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-gold-muted">
                      <BookOpen className="h-4 w-4" />
                      {referenceSectionTitle("Bíblia", bibleRefs.length)}
                    </div>
                    <div className="space-y-3">
                      {bibleRefs.map((ref: any) => (
                        <div
                          key={ref.id}
                          className="print-keep rounded-sm border border-brand-gold/30 bg-brand-gold/10 p-4"
                        >
                          <div className="mb-2 text-sm font-semibold text-brand-gold-muted">
                            {ref.label}
                          </div>
                          {ref.text ? (
                            <p className="text-[15px] leading-7 text-brand-ink">
                              {ref.text}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {catechismRefs.length > 0 && (
                  <div className="space-y-3">
                    <div className="print-section-title flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-ink">
                      <Church className="h-4 w-4" />
                      {referenceSectionTitle("Catecismo", catechismRefs.length)}
                    </div>
                    <div className="space-y-3">
                      {catechismRefs.map((ref: any) => (
                        <div
                          key={ref.id}
                          className="print-keep rounded-sm border border-border/70 bg-muted/30 p-4"
                        >
                          <div className="mb-2 text-sm font-semibold text-brand-ink">
                            {ref.label}
                          </div>
                          {ref.title && (
                            <p className="mb-2 text-sm font-semibold tracking-tight text-brand-ink">
                              {ref.title}
                            </p>
                          )}
                          {ref.text && (
                            <p className="text-[15px] leading-7 text-brand-ink">
                              {ref.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {directoryRefs.length > 0 && (
                  <div className="space-y-3">
                    <div className="print-section-title flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-ink">
                      <FileText className="h-4 w-4" />
                      {referenceSectionTitle(
                        "Diretório para a Catequese",
                        directoryRefs.length,
                      )}
                    </div>
                    <div className="space-y-3">
                      {directoryRefs.map((ref: any) => (
                        <div
                          key={ref.id}
                          className="print-keep rounded-sm border border-brand-ink/20 bg-brand-ink/5 p-4"
                        >
                          <div className="mb-2 text-sm font-semibold text-brand-ink">
                            {ref.label}
                          </div>
                          {ref.title && (
                            <p className="mb-2 text-sm font-semibold tracking-tight text-brand-ink">
                              {ref.title}
                            </p>
                          )}
                          {ref.text && (
                            <p className="text-[15px] leading-7 text-brand-ink">
                              {ref.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {activities.length > 0 && (
              <section className="mt-10">
                <h2 className="print-section-title mb-3 border-b border-brand-ink/12 pb-2 text-sm font-semibold uppercase tracking-[0.12em] text-brand-ink">
                  {t("print_page.activities_title", {
                    count: activities.length,
                  })}
                </h2>
                <div className="space-y-5">
                  {activities.map((activity: any, index: number) => {
                    const data = parseData(activity.data);
                    const typeLabel =
                      activityTypes.find((type) => type.value === activity.type)
                        ?.label || activity.type;
                    return (
                      <div
                        key={activity.id}
                        className="print-keep rounded-sm border border-border/70 bg-white p-4"
                      >
                        <h3 className="mb-1 font-semibold tracking-tight text-brand-ink">
                          {index + 1}. {activity.title} — {typeLabel}
                        </h3>
                        {activity.description && (
                          <p className="mb-3 text-sm italic text-muted-foreground">
                            {activity.description}
                          </p>
                        )}
                        {activity.type === "QUIZ" &&
                          data.questions?.map(
                            (question: any, questionIndex: number) => (
                              <div
                                key={question.id || questionIndex}
                                className="mb-3 rounded-sm border border-border/70 bg-background p-3"
                              >
                                <p className="mb-2 text-sm font-semibold tracking-tight text-brand-ink">
                                  {questionIndex + 1}. {question.question}
                                </p>
                                <div className="ml-2 grid gap-1 sm:ml-4 sm:grid-cols-2">
                                  {question.options?.map(
                                    (option: string, optionIndex: number) => (
                                      <div
                                        key={optionIndex}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-border/70 text-xs font-semibold text-brand-ink">
                                          {["A", "B", "C", "D"][optionIndex]}
                                        </span>
                                        <span>{option}</span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        {activity.type === "GROUP_DYNAMIC" &&
                          data.steps?.map((step: any, stepIndex: number) => (
                            <div
                              key={step.id || stepIndex}
                              className="mb-2 rounded-sm border border-border/70 bg-background p-3 text-sm"
                            >
                              <p className="font-semibold tracking-tight text-brand-ink">
                                {t("print_page.step", { num: stepIndex + 1 })}{" "}
                                {step.instruction}
                              </p>
                            </div>
                          ))}
                        {activity.type === "FAMILY_ACTIVITY" && data.task && (
                          <p className="rounded-sm border border-border/70 bg-muted/30 p-3 text-sm">
                            {data.task}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <footer className="print-keep mt-10 border-t border-brand-ink/10 pt-4 text-center text-xs text-muted-foreground">
              {t("print_page.footer")}
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}
