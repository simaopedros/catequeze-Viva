import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Printer, ArrowLeft, Clock } from 'lucide-react';
import { useQuery, getContentItem, listActivitiesByContent } from 'wasp/client/operations';
import { useActivityTypes } from '../../i18n/useLabels';
import { parseContentDocument, buildLegacyContentDocument } from '../../shared/contentDocument';
import { ContentDocumentRenderer } from '../components/content/ContentDocumentRenderer';

function parseData(data: string | null): any {
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}

export default function ContentPrintPage() {
  const { t } = useTranslation('content');
  const activityTypes = useActivityTypes();
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading } = useQuery(getContentItem, { id: id! });
  const { data: activities = [] } = useQuery(listActivitiesByContent, { contentId: id! });

  const statusLabel = (status: string) => {
    const key = `status_${status.toLowerCase()}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  if (isLoading) {
    return <div className="mx-auto max-w-4xl p-8 text-center"><p className="text-muted-foreground">{t('print_page.loading')}</p></div>;
  }

  if (!item) {
    return <div className="p-6 text-center text-destructive">{t('print_page.not_found')}</div>;
  }

  const document = parseContentDocument(item.documentJson) || buildLegacyContentDocument(item);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 1.6cm; }
          body * { visibility: hidden; }
          #print-content, #print-content * { visibility: visible; }
          #print-content { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-section { break-inside: avoid; }
          #print-content h1 { font-size: 20pt; }
          #print-content h2 { font-size: 14pt; }
          #print-content p, #print-content li, #print-content td, #print-content th { font-size: 11pt; line-height: 1.7; }
          #print-content img { max-width: 100% !important; max-height: 320px !important; object-fit: contain !important; }
        }
      `}</style>
      <div className="no-print mx-auto flex max-w-4xl items-center justify-between px-4 pt-4">
        <Button variant="ghost" size="sm" asChild><Link to={`/app/content-library/${id}`}><ArrowLeft className="mr-1 h-4 w-4" />{t('print_page.back')}</Link></Button>
        <div className="flex gap-2">
          <Badge variant="secondary">{statusLabel(item.status)}</Badge>
          <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" />{t('print_page.print_pdf')}</Button>
        </div>
      </div>

      <div id="print-content" className="mx-auto max-w-4xl bg-white px-6 py-8 text-gray-900">
        <div className="print-section mb-8 border-b-2 border-gray-300 pb-6 text-center">
          <p className="mb-4 text-xs uppercase tracking-widest text-gray-400">{t('print_page.header_badge')}</p>
          <h1 className="mb-2 text-2xl font-bold">{item.title}</h1>
          {item.theme && <p className="mb-3 text-lg italic text-gray-600">{item.theme}</p>}
          <div className="flex justify-center gap-4 text-sm text-gray-500">
            {item.estimatedTime && <span><Clock className="inline h-4 w-4" /> {t('print_page.minutes', { count: item.estimatedTime })}</span>}
            {item.createdBy && <span>{t('print_page.prepared_by', { name: `${item.createdBy.firstName} ${item.createdBy.lastName}` })}</span>}
          </div>
        </div>

        <div className="print-section rounded-[24px] border border-gray-200 bg-white p-8">
          <ContentDocumentRenderer document={document} className="prose-neutral prose-img:max-h-[320px]" />
        </div>

        {activities.length > 0 && (
          <div className="print-section mt-8">
            <h2 className="mb-3 border-b pb-2 text-sm font-bold uppercase text-blue-700">{t('print_page.activities_title', { count: activities.length })}</h2>
            <div className="space-y-6">
              {activities.map((activity: any, index: number) => {
                const data = parseData(activity.data);
                const typeLabel = activityTypes.find((type) => type.value === activity.type)?.label || activity.type;
                return (
                  <div key={activity.id} className="rounded-lg border p-4">
                    <h3 className="mb-1 font-bold">{index + 1}. {activity.title} — {typeLabel}</h3>
                    {activity.description && <p className="mb-3 text-sm italic text-gray-500">{activity.description}</p>}
                    {activity.type === 'QUIZ' && data.questions?.map((question: any, questionIndex: number) => (
                      <div key={question.id || questionIndex} className="mb-3 rounded bg-gray-50 p-3">
                        <p className="mb-2 text-sm font-semibold">{questionIndex + 1}. {question.question}</p>
                        <div className="ml-4 grid grid-cols-2 gap-1">
                          {question.options?.map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-2 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">{['A', 'B', 'C', 'D'][optionIndex]}</span><span>{option}</span></div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {activity.type === 'GROUP_DYNAMIC' && data.steps?.map((step: any, stepIndex: number) => (
                      <div key={step.id || stepIndex} className="mb-2 rounded bg-gray-50 p-3 text-sm">
                        <p className="font-semibold">{t('print_page.step', { num: stepIndex + 1 })} {step.instruction}</p>
                      </div>
                    ))}
                    {activity.type === 'FAMILY_ACTIVITY' && data.task && <p className="rounded bg-purple-50 p-3 text-sm">{data.task}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
