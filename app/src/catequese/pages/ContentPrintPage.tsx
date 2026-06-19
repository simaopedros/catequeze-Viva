import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Printer, ArrowLeft, Clock } from 'lucide-react';
import { useQuery, getContentItem, listActivitiesByContent } from 'wasp/client/operations';
import { useActivityTypes } from '../../i18n/useLabels';

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
    return (
        <div className="max-w-4xl mx-auto p-8 text-center">
          <p className="text-muted-foreground">{t('print_page.loading')}</p>
        </div>
    );
  }

  if (!item) {
    return (
        <div className="p-6 text-destructive text-center">{t('print_page.not_found')}</div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 2cm; }
          body * { visibility: hidden; }
          #print-content, #print-content * { visibility: visible; }
          #print-content { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-section { break-inside: avoid; }
          #print-content h1 { font-size: 20pt; }
          #print-content h2 { font-size: 14pt; }
          #print-content p, #print-content li { font-size: 11pt; line-height: 1.7; }
          .ref-box { border: 1px solid #ccc; background: #f9f9f9 !important; }
        }
      `}</style>
        <div className="no-print max-w-4xl mx-auto px-4 pt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/app/content-library/${id}`}><ArrowLeft className="mr-1 h-4 w-4"/>{t('print_page.back')}</Link>
          </Button>
          <div className="flex gap-2">
            <Badge variant="secondary">{statusLabel(item.status)}</Badge>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4"/>{t('print_page.print_pdf')}
            </Button>
          </div>
        </div>

        <div id="print-content" className="max-w-4xl mx-auto px-6 py-8 font-serif text-gray-900 bg-white">
          {/* Header */}
          <div className="text-center mb-8 print-section border-b-2 border-gray-300 pb-6">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">{t('print_page.header_badge')}</p>
            <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
            {item.theme && <p className="text-lg italic text-gray-600 mb-3">{item.theme}</p>}
            <div className="flex justify-center gap-4 text-sm text-gray-500">
              {item.estimatedTime && <span><Clock className="inline h-4 w-4"/> {t('print_page.minutes', { count: item.estimatedTime })}</span>}
              {item.createdBy && <span>{t('print_page.prepared_by', { name: `${item.createdBy.firstName} ${item.createdBy.lastName}` })}</span>}
            </div>
            <div className="mt-4 border-b-2 border-gray-300 w-32 mx-auto"/>
          </div>

          {/* Materials Checklist */}
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200 print-section">
            <h2 className="text-sm font-bold uppercase text-amber-700 mb-2">{t('print_page.materials_title')}</h2>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded" readOnly /> {t('print_page.material_bible')}</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded" readOnly /> {t('print_page.material_catechism')}</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded" readOnly /> {t('print_page.material_sheets')}</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded" readOnly /> {t('print_page.material_pens')}</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded" readOnly /> {t('print_page.material_candles')}</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded" readOnly /> {t('print_page.material_music')}</label>
              <li className="col-span-2"><input type="text" placeholder={t('print_page.material_other')} className="border-0 border-b border-dashed border-gray-300 bg-transparent text-sm w-full outline-none" readOnly /></li>
            </div>
          </div>

          {/* Pastoral Objective */}
          {item.pastoralObjective && (
            <div className="mb-6 print-section">
              <h2 className="text-sm font-bold uppercase text-blue-700 mb-2">{t('pastoral_objective')}</h2>
              <p>{item.pastoralObjective}</p>
            </div>
          )}

          {/* Opening Prayer */}
          {item.openingPrayer && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border print-section ref-box">
              <h2 className="text-sm font-bold uppercase text-blue-700 mb-2">{t('print_page.opening_prayer')}</h2>
              <p className="italic whitespace-pre-line">{item.openingPrayer}</p>
            </div>
          )}

          {/* Biblical Reading */}
          {item.biblicalRef && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 print-section ref-box">
              <h2 className="text-sm font-bold uppercase text-blue-800 mb-2">{t('print_page.word_moment')}</h2>
              <p className="whitespace-pre-line text-sm">{item.biblicalRef}</p>
            </div>
          )}

          {/* Main Content */}
          {item.mainContent && (
            <div className="mb-6 print-section">
              <h2 className="text-sm font-bold uppercase text-blue-700 mb-3">{t('print_page.central_content')}</h2>
              <div className="whitespace-pre-line leading-relaxed">{item.mainContent}</div>
            </div>
          )}

          {/* Dynamic */}
          {item.dynamic && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100 print-section ref-box">
              <h2 className="text-sm font-bold uppercase text-green-700 mb-2">{t('print_page.group_dynamic')}</h2>
              <div className="whitespace-pre-line">{item.dynamic}</div>
            </div>
          )}

          {/* Activity */}
          {item.activity && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100 print-section ref-box">
              <h2 className="text-sm font-bold uppercase text-yellow-700 mb-2">{t('print_page.activity_section')}</h2>
              <div className="whitespace-pre-line">{item.activity}</div>
            </div>
          )}

          {/* Family Task */}
          {item.familyTask && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100 print-section ref-box">
              <h2 className="text-sm font-bold uppercase text-purple-700 mb-2">{t('print_page.family_commitment')}</h2>
              <p>{item.familyTask}</p>
            </div>
          )}

          {/* Closing Prayer */}
          {item.closingPrayer && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border print-section ref-box">
              <h2 className="text-sm font-bold uppercase text-blue-700 mb-2">{t('print_page.closing_prayer')}</h2>
              <p className="italic whitespace-pre-line">{item.closingPrayer}</p>
            </div>
          )}

          {/* Bible References */}
          {item.bibleRefs?.length > 0 && (
            <div className="mb-6 print-section">
              <h2 className="text-sm font-bold uppercase text-blue-800 mb-3 border-b pb-2">{t('print_page.bible_refs')}</h2>
              <div className="space-y-3">
                {item.bibleRefs.map((ref: any) => (
                  <div key={ref.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100 ref-box">
                    <p className="text-sm font-bold text-blue-900 mb-1">
                      {ref.verse?.chapter?.book?.name || ''} {ref.verse?.chapter?.number}:{ref.verse?.number}
                    </p>
                    <p className="text-sm italic">"{ref.verse?.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catechism References */}
          {item.catechismRefs?.length > 0 && (
            <div className="mb-6 print-section">
              <h2 className="text-sm font-bold uppercase text-amber-800 mb-3 border-b pb-2">{t('print_page.catechism_refs')}</h2>
              <div className="space-y-3">
                {item.catechismRefs.map((ref: any) => (
                  <div key={ref.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100 ref-box">
                    <p className="text-sm font-bold text-amber-900 mb-1">CIC §{ref.entry?.number}</p>
                    {ref.entry?.question && <p className="text-sm font-semibold mb-1">{ref.entry.question}</p>}
                    {ref.entry?.answer && <p className="text-sm">{ref.entry.answer}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities */}
          {activities.length > 0 && (
            <div className="mb-6 print-section">
              <h2 className="text-sm font-bold uppercase text-blue-700 mb-3 border-b pb-2">{t('print_page.activities_title', { count: activities.length })}</h2>
              <div className="space-y-6">
                {activities.map((a: any, ai: number) => {
                  const data = parseData(a.data);
                  const typeLabel = activityTypes.find(at => at.value === a.type)?.label || a.type;

                  return (
                    <div key={a.id} className="p-4 border rounded-lg print-section">
                      <h3 className="font-bold mb-1">
                        {ai + 1}. {a.title} — {typeLabel} {a.points > 0 ? t('print_page.points', { count: a.points }) : ''}
                      </h3>
                      {a.description && <p className="text-sm text-gray-500 italic mb-3">{a.description}</p>}

                      {/* QUIZ */}
                      {a.type === 'QUIZ' && data.questions?.map((q: any, qi: number) => (
                        <div key={q.id || qi} className="mb-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-semibold mb-2">{qi + 1}. {q.question}</p>
                          <div className="grid grid-cols-2 gap-1 ml-4">
                            {q.options?.map((opt: string, oi: number) => (
                              <div key={oi} className="text-sm flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full border text-xs flex items-center justify-center">{['A','B','C','D'][oi]}</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                          {q.explanation && <p className="text-xs text-gray-500 mt-2 ml-4 italic">💡 {q.explanation}</p>}
                        </div>
                      ))}

                      {/* CHECKLIST */}
                      {a.type === 'PARTICIPATION_CHECKLIST' && data.items?.map((item: any, ci: number) => (
                        <div key={item.id || ci} className="flex items-center gap-3 p-2">
                          <span className="w-5 h-5 border-2 rounded flex-shrink-0"/>
                          <span className="text-sm">{item.text}</span>
                        </div>
                      ))}

                      {/* OPEN_QUESTION */}
                      {a.type === 'OPEN_QUESTION' && data.question && (
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm font-medium mb-4">{data.question}</p>
                          <div className="border-b border-dashed border-gray-300 my-6"/>
                          <div className="border-b border-dashed border-gray-300 my-6"/>
                        </div>
                      )}

                      {/* GUIDED_REFLECTION */}
                      {a.type === 'GUIDED_REFLECTION' && (
                        <>
                          {data.guide && <p className="text-sm italic p-3 bg-gray-50 rounded mb-3">{data.guide}</p>}
                          {data.prompts?.map((p: any, pi: number) => (
                            <div key={p.id || pi} className="mb-3">
                              <p className="text-sm font-medium mb-1">{pi + 1}. {p.question}</p>
                              <div className="border-b border-dashed border-gray-300 ml-4 h-8"/>
                            </div>
                          ))}
                        </>
                      )}

                      {/* GROUP_DYNAMIC */}
                      {a.type === 'GROUP_DYNAMIC' && data.steps?.map((step: any, si: number) => (
                        <div key={step.id || si} className="mb-2 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-semibold">{t('print_page.step', { num: si + 1 })} {step.instruction}</p>
                          <div className="flex gap-4 text-xs text-gray-500 mt-1">
                            {step.duration && <span>⏱ {step.duration} min</span>}
                            {step.materials && <span>📦 {step.materials}</span>}
                          </div>
                        </div>
                      ))}

                      {/* FAMILY_ACTIVITY */}
                      {a.type === 'FAMILY_ACTIVITY' && data.task && (
                        <p className="text-sm p-3 bg-purple-50 rounded">{data.task}</p>
                      )}

                      {/* BIBLE_READING */}
                      {a.type === 'BIBLE_READING' && (
                        <>
                          {data.reference && <p className="text-sm font-semibold text-blue-700 mb-2">📖 {data.reference}</p>}
                          {data.questions?.map((q: any, qi: number) => (
                            <div key={q.id || qi} className="mb-3">
                              <p className="text-sm font-medium mb-1">{qi + 1}. {q.question}</p>
                              <div className="border-b border-dashed border-gray-300 ml-4 h-8"/>
                            </div>
                          ))}
                        </>
                      )}

                      {/* MATCHING */}
                      {a.type === 'MATCHING' && data.pairs && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase text-gray-500">{t('print_page.column_a')}</p>
                            {data.pairs.map((p: any, pi: number) => (
                              <div key={p.id || pi} className="p-2 border rounded text-sm">{pi + 1}. {p.left}</div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase text-gray-500">{t('print_page.column_b')}</p>
                            {[...data.pairs].sort(() => Math.random() - 0.5).map((p: any, pi: number) => (
                              <div key={p.id || pi} className="p-2 border rounded text-sm">{['A','B','C','D','E','F'][pi]}. {p.right}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TASK_WITH_ATTACHMENT */}
                      {a.type === 'TASK_WITH_ATTACHMENT' && (
                        <div className="p-4 bg-gray-50 rounded text-center">
                          <p className="text-4xl mb-2">📎</p>
                          <p className="text-sm font-medium">{t('print_page.task_attachment')}</p>
                          {data.requiresUpload && <p className="text-xs text-gray-500 mt-1">{t('print_page.requires_upload')}</p>}
                        </div>
                      )}

                      {/* RITE_CELEBRATION */}
                      {a.type === 'RITE_CELEBRATION' && data.rite && (
                        <p className="text-sm italic p-4 bg-amber-50 rounded border border-amber-200 whitespace-pre-line">{data.rite}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes section */}
          <div className="mt-10 print-section">
            <h2 className="text-sm font-bold uppercase text-gray-500 mb-3 border-b pb-2">{t('print_page.catechist_notes')}</h2>
            <div className="border border-dashed border-gray-300 rounded-lg p-1" style={{ minHeight: '120px' }}>
              <div className="w-full" style={{ minHeight: '100px' }} />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 mt-12 pt-6 border-t print-section">
            <p>{t('print_page.footer')}</p>
          </div>
        </div>
    </>
  );
}
