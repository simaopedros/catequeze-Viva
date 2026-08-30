import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  ArrowLeft,
  Heart,
  BookOpen,
  FileText,
  CheckCircle,
  XCircle,
  Edit3,
  MessageCircle,
  FilePlus,
  Upload,
  Download,
  Link2,
  Copy,
  AlertTriangle,
  Cross,
  Trash2,
  BarChart3,
  Mail,
} from "lucide-react";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { DetailTabs } from "../../client/components/DetailTabs";
import { useDetailTab } from "../../client/hooks/useDetailTab";
import { PastoralAnalysisInline } from "../components/PastoralAnalysisInline";

const CATECHUMEN_DETAIL_TABS = [
  "overview",
  "attendance",
  "sacraments",
  "documents",
] as const;
import {
  AppPageHeader,
  AppMetric,
} from "../../client/components/brand/AppChrome";
import {
  useQuery,
  getCatechumenProfile,
  listMeetings,
  getMeetingAttendance,
  createConversation,
  generateCatechumenUploadToken,
  getCatechumenAttendanceReport,
  justifyAbsence,
  deleteCatechumen,
} from "wasp/client/operations";
import {
  fetchAuthenticatedDocument,
  uploadDocumentMultipart,
} from "../../client/utils/documentUpload";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { toast } from "../../client/hooks/use-toast";
import { calculatePoints } from "../../shared/gamification";
import { formatDateOnly, getAgeFromDate } from "../../i18n/format";

const AVATAR_COLORS = ["border border-border/70 bg-muted/30 text-brand-ink"];

const DOC_TYPE_KEYS: Record<string, string> = {
  BAPTISM_CERTIFICATE: "BAPTISM_CERTIFICATE",
  BIRTH_CERTIFICATE: "BIRTH_CERTIFICATE",
  CONSENT_FORM: "CONSENT_FORM",
  MARRIAGE_CERTIFICATE: "MARRIAGE_CERTIFICATE",
  PASTORAL_LETTER: "PASTORAL_LETTER",
  OTHER: "OTHER",
};

const DOC_TYPE_SHORT_KEYS: Record<string, string> = {
  BAPTISM_CERTIFICATE: "BAPTISM_SHORT",
  BIRTH_CERTIFICATE: "BIRTH_SHORT",
  CONSENT_FORM: "CONSENT_SHORT",
  MARRIAGE_CERTIFICATE: "MARRIAGE_SHORT",
  PASTORAL_LETTER: "PASTORAL_SHORT",
  OTHER: "OTHER_SHORT",
};

export default function CatechumenDetailPage() {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const { t: tpa } = useTranslation("pastoralAnalysis");
  const { t: tf } = useTranslation("family");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const { workspaceId } = useActiveWorkspace();
  const {
    data: profile,
    isLoading: loading,
    error: queryError,
  } = useQuery(getCatechumenProfile, { id: id! }, { enabled: !!id });
  const canEdit = [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "PERSONAL_OWNER",
  ].includes(userRole);
  const [tab, setTab] = useDetailTab(CATECHUMEN_DETAIL_TABS, "overview");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docType, setDocType] = useState("BAPTISM_CERTIFICATE");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justifyNote, setJustifyNote] = useState("");
  const [savingJustify, setSavingJustify] = useState(false);
  const [tokenData, setTokenData] = useState<{
    token: string;
    expires: string;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedAnalysisClassId, setSelectedAnalysisClassId] = useState<
    string | null
  >(null);

  const docTypeLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const [key, i18nKey] of Object.entries(DOC_TYPE_KEYS)) {
      labels[key] = t(`catechumens.doc_types.${i18nKey}`);
    }
    return labels;
  }, [t]);

  const handleDmGuardian = async (guardianUserId: string) => {
    const targetWorkspaceId = workspaceId || profile?.parish?.id;
    if (!targetWorkspaceId) {
      toast({
        title: t("error"),
        description: t("try_again"),
        variant: "destructive",
      });
      return;
    }
    try {
      const conv = await createConversation({
        type: "DIRECT",
        parishId: targetWorkspaceId,
        participantUserIds: [guardianUserId],
      });
      navigate(`/app/messages?c=${conv.id}`);
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_chat_error", {
          message: e.message || t("try_again"),
        }),
      });
    }
  };

  const handleDownloadDocument = async (docId: string, docName: string) => {
    try {
      const blob = await fetchAuthenticatedDocument(docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_download_error"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleDocUpload = async () => {
    if (!docFile) return;
    setUploading(true);
    try {
      await uploadDocumentMultipart({
        file: docFile,
        name: docTypeLabels[docType] || docType,
        type: docType,
        catechumenProfileId: id!,
      });
      setDocFile(null);
      setShowDocUpload(false);
      toast({ title: t("catechumens.detail_document_sent") });
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_upload_error", {
          message: e.message || t("try_again"),
        }),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const result = await generateCatechumenUploadToken({
        catechumenProfileId: id!,
      });
      setTokenData({
        token: result.token,
        expires: new Date(result.expires).toLocaleDateString(),
      });
      toast({ title: t("catechumens.detail_upload_link_success") });
    } catch (e: any) {
      toast({ title: `${t("error")}: ${e.message || t("try_again")}` });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const result = await getCatechumenAttendanceReport({ catechumenId: id! });
      setReport(result);
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_report_error", {
          message: e.message || t("try_again"),
        }),
      });
    }
    setLoadingReport(false);
  };

  const getUploadLink = () =>
    tokenData?.token
      ? `${window.location.origin}/upload-docs/${tokenData.token}`
      : "";
  const handleCopyLink = () => {
    const link = getUploadLink();
    if (link) {
      navigator.clipboard.writeText(link);
      toast({ title: t("catechumens.detail_link_copied") });
    }
  };

  useEffect(() => {
    if (!profile?.enrollments?.length) return;
    (async () => {
      const all: any[] = [];
      for (const e of profile.enrollments) {
        const mts = (await listMeetings({ classId: e.class?.id })) || [];
        for (const m of mts) {
          const records =
            (await getMeetingAttendance({ meetingId: m.id })) || [];
          const mine = records.find((r: any) => r.catechumenProfileId === id);
          if (mine)
            all.push({
              ...mine,
              meetingTitle: m.title,
              meetingDate: m.date,
              className: e.class?.name,
            });
        }
      }
      setAttendance(all.slice(-10).reverse());
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile?.enrollments?.length || selectedAnalysisClassId) return;
    const preferred =
      profile.enrollments.find((enr: any) => enr.status === "ENROLLED") ||
      profile.enrollments[0];
    if (preferred?.classId) setSelectedAnalysisClassId(preferred.classId);
  }, [profile, selectedAnalysisClassId]);
  if (loading)
    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-sm bg-muted" />
          <div className="h-8 w-40 bg-muted rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-sm bg-muted" />
          ))}
        </div>
      </div>
    );
  if (queryError) {
    const status = (queryError as any)?.status;
    const msg = (queryError as any)?.message || String(queryError);
    const isForbidden = status === 403 || msg?.includes("não tem acesso");
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div>
          <p className="text-lg font-semibold text-destructive">
            {isForbidden
              ? t("catechumens.detail_access_denied")
              : t("catechumens.detail_load_error")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{msg}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/app/catechumens">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("catechumens.back_to_list")}
          </Link>
        </Button>
      </div>
    );
  }
  if (!profile)
    return <div className="p-6 text-destructive">{t("not_found")}</div>;

  const getAge = (bd: string) => getAgeFromDate(bd);
  const age = getAge(profile.birthDate);
  const attendancePct = attendance.length
    ? Math.round(
        (attendance.filter(
          (a: any) => a.status === "PRESENT" || a.status === "JUSTIFIED",
        ).length /
          attendance.length) *
          100,
      )
    : null;

  const handleJustify = async () => {
    if (!justifyingId || !justifyNote.trim()) return;
    setSavingJustify(true);
    try {
      await justifyAbsence({
        attendanceId: justifyingId,
        note: justifyNote.trim(),
      });
      setAttendance((prev) =>
        prev.map((a: any) =>
          a.id === justifyingId ? { ...a, status: "JUSTIFIED" } : a,
        ),
      );
      setJustifyingId(null);
      setJustifyNote("");
    } catch (e: any) {
      // Silently fail — attendance row stays the same
    } finally {
      setSavingJustify(false);
    }
  };

  const handleDeleteCatechumen = async () => {
    setDeleting(true);
    try {
      await deleteCatechumen({ id: id! });
      toast({ title: t("catechumens.deleted_success") });
      navigate("/app/catechumens");
    } catch (e: any) {
      toast({
        title: t("error"),
        description: e?.message || t("try_again"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const detailSubtitle = [
    age ? t("catechumens.years_old", { age }) : null,
    profile.birthDate ? formatDateOnly(profile.birthDate, "pt-BR") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0 rounded-sm"
            asChild
          >
            <Link to="/app/catechumens">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div
            className={`mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm text-xl font-semibold ${
              !profile.photoUrl
                ? AVATAR_COLORS[
                    Math.abs(profile.firstName?.charCodeAt(0) || 0) %
                      AVATAR_COLORS.length
                  ]
                : "border border-border/70"
            }`}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.firstName}
                className="h-full w-full object-cover"
              />
            ) : (
              `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`
            )}
          </div>
          <AppPageHeader
            className="min-w-0 flex-1 border-0 pb-0"
            eyebrow={t("catechumens.detail", {
              defaultValue: "Catequizando",
            })}
            title={`${profile.firstName} ${profile.lastName}`}
            subtitle={detailSubtitle || undefined}
            actions={
              canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-sm"
                    asChild
                  >
                    <Link
                      to={`/app/family-invites?role=CATECHUMEN&email=${encodeURIComponent(
                        profile.email || "",
                      )}&householdId=${encodeURIComponent(
                        profile.householdId || "",
                      )}`}
                    >
                      <Mail className="mr-1 h-3 w-3" />
                      {tf("portal_invites.context_catechumen")}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-sm"
                    asChild
                  >
                    <Link to={`/app/catechumens/${id}/edit`}>
                      <Edit3 className="mr-1 h-3 w-3" />
                      {t("edit")}
                    </Link>
                  </Button>
                </div>
              ) : undefined
            }
          />
        </div>

        {attendancePct !== null && (
          <div className="grid grid-cols-3 gap-3">
            <AppMetric
              label={t("catechumens.detail_presence")}
              value={`${attendancePct}%`}
            />
            <AppMetric
              label={tp("classes")}
              value={profile.enrollments?.length || 0}
            />
            <AppMetric
              label={t("catechumens.detail_journeys")}
              value={profile.sacramentalJourneys?.length || 0}
            />
          </div>
        )}

        <DetailTabs
          tabs={[
            {
              id: "overview",
              label: t("catechumens.tab_overview", {
                defaultValue: "Visão geral",
              }),
            },
            {
              id: "attendance",
              label: t("catechumens.tab_attendance", {
                defaultValue: "Presença",
              }),
            },
            {
              id: "sacraments",
              label: t("catechumens.tab_sacraments", {
                defaultValue: "Sacramentos",
              }),
            },
            {
              id: "documents",
              label: t("catechumens.tab_documents", {
                defaultValue: "Documentos",
              }),
            },
          ]}
          value={tab}
          onChange={(id) =>
            setTab(id as (typeof CATECHUMEN_DETAIL_TABS)[number])
          }
        />

        {tab === "overview" &&
          attendance.length > 0 &&
          (() => {
            const present = attendance.filter(
              (a: any) => a.status === "PRESENT" || a.status === "LATE",
            ).length;
            const points = calculatePoints({
              totalPresent: present,
              totalMeetings: attendance.length,
              quizzesCompleted: 0,
              quizzesPerfect: 0,
            });
            return (
              <div className="rounded-sm border border-border/70 bg-white p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("catechumens.detail_progress")}
                </p>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums text-brand-ink">
                    {points}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("catechumens.detail_points")}
                  </span>
                </div>
                {attendancePct !== null && attendancePct >= 90 && (
                  <div className="rounded-sm border border-brand-gold/30 bg-brand-gold/10 p-2 text-xs font-medium text-brand-gold-muted">
                    {t("catechumens.detail_perfect_attendance")}
                  </div>
                )}
              </div>
            );
          })()}

        {tab === "overview" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-sm border border-border/70 bg-white p-4">
              <div className="mb-2 space-y-1.5">
                <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Heart className="h-3.5 w-3.5" />
                  {t("catechumens.detail_family")}
                </h3>
                <div className="h-px w-8 bg-brand-gold" aria-hidden />
              </div>
              <p className="font-semibold tracking-tight text-brand-ink">
                {profile.household?.name || t("catechumens.detail_not_linked")}
              </p>
              {profile.household?.guardians?.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {g.user?.firstName} {g.user?.lastName}{" "}
                    {g.relationship && `(${g.relationship})`}
                  </p>
                  <button
                    onClick={() => handleDmGuardian(g.user?.id)}
                    className="text-brand-ink hover:text-brand-ink-soft p-1"
                    title={t("catechumens.detail_send_message")}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-sm border border-border/70 bg-white p-4">
              <div className="mb-2 space-y-1.5">
                <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  {tp("classes")}
                </h3>
                <div className="h-px w-8 bg-brand-gold" aria-hidden />
              </div>
              {profile.enrollments?.map((e: any) => (
                <Link
                  key={e.id}
                  to={`/app/classes/${e.class?.id}`}
                  className="block py-0.5 text-sm font-semibold tracking-tight text-brand-ink hover:underline"
                >
                  {e.class?.name}{" "}
                  {e.class?.stage?.name && `· ${e.class.stage.name}`}
                </Link>
              )) || (
                <p className="text-sm text-muted-foreground">
                  {t("catechumens.detail_none")}
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "attendance" && attendance.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("catechumens.detail_attendance_history")}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            <div className="space-y-1">
              {attendance.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.meetingDate).toLocaleDateString()}
                    </span>{" "}
                    <span className="font-semibold tracking-tight text-brand-ink">
                      {a.meetingTitle || t("catechumens.detail_meeting")}
                    </span>
                    <span className="text-overline text-muted-foreground ml-1">
                      ({a.className})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        a.status === "PRESENT"
                          ? "default"
                          : a.status === "ABSENT"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-overline"
                    >
                      {a.status === "PRESENT"
                        ? t("catechumens.detail_present")
                        : a.status === "ABSENT"
                          ? t("catechumens.detail_absent")
                          : a.status}
                    </Badge>
                    {(a.status === "ABSENT" || a.status === "LATE") &&
                      (justifyingId === a.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleJustify();
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            value={justifyNote}
                            onChange={(e) => setJustifyNote(e.target.value)}
                            placeholder={t("catechumens.detail_justify_reason")}
                            aria-label={t("catechumens.detail_justify_reason")}
                            className="h-7 w-28 rounded border px-2 text-xs"
                            autoFocus
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={savingJustify}
                          >
                            {savingJustify ? "..." : "✓"}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setJustifyingId(null)}
                            className="text-xs text-muted-foreground"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-brand-ink"
                          onClick={() => {
                            setJustifyingId(a.id);
                            setJustifyNote("");
                          }}
                        >
                          {t("catechumens.detail_justify")}
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              {!report ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                >
                  <FileText className="mr-1 h-3 w-3" />
                  {loadingReport
                    ? t("catechumens.detail_generating_report")
                    : t("catechumens.detail_generate_report")}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold tracking-tight text-brand-ink">
                      {t("catechumens.detail_attendance_report")}
                    </h4>
                    {report.canSeeSensitiveSignals ? (
                      <Badge
                        variant={
                          report.riskLevel === "ALTO"
                            ? "destructive"
                            : report.riskLevel === "MÉDIO"
                              ? "secondary"
                              : "default"
                        }
                        className="text-overline"
                      >
                        {t("catechumens.detail_risk", {
                          level: report.riskLevel,
                        })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-overline">
                        Resumo restrito
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                      <p className="text-lg font-semibold tracking-tight tabular-nums text-brand-ink">
                        {report.totalPresent}
                      </p>
                      <p className="text-muted-foreground">
                        {t("catechumens.detail_present_count")}
                      </p>
                    </div>
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                      <p className="text-lg font-semibold tracking-tight tabular-nums text-brand-ink">
                        {report.totalAbsent}
                      </p>
                      <p className="text-muted-foreground">
                        {t("catechumens.detail_absent_count")}
                      </p>
                    </div>
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                      <p className="text-lg font-semibold tracking-tight tabular-nums text-brand-ink">
                        {report.totalJustified}
                      </p>
                      <p className="text-muted-foreground">
                        {t("catechumens.detail_justified_count")}
                      </p>
                    </div>
                  </div>
                  {report.maxConsecutiveAbsences >= 3 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {t("catechumens.detail_consecutive_absences", {
                        count: report.maxConsecutiveAbsences,
                      })}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReport(null)}
                    className="text-xs"
                  >
                    {t("catechumens.detail_close_report")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "sacraments" && profile.sacramentalJourneys?.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Cross className="h-4 w-4 text-brand-ink" />
                {t("catechumens.detail_sacramental_journeys")}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            <div className="space-y-2">
              {profile.sacramentalJourneys.map((j: any) => {
                const total = j.milestones?.length || 0;
                const done =
                  j.milestones?.filter(
                    (m: any) =>
                      m.status === "COMPLETED" || m.status === "APPROVED",
                  ).length || 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const hasBlocked = j.milestones?.some(
                  (m: any) => m.status === "REJECTED",
                );
                const hasWaiting = j.milestones?.some(
                  (m: any) => m.status === "WAITING_APPROVAL",
                );
                return (
                  <Link
                    key={j.id}
                    to={`/app/sacramental-journeys/${j.id}`}
                    className="block rounded-sm border border-border/70 bg-white p-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold tracking-tight text-brand-ink">
                        {j.template?.name}
                      </span>
                      <Badge
                        variant={pct === 100 ? "default" : "outline"}
                        className="text-overline"
                      >
                        {done}/{total}
                      </Badge>
                    </div>
                    <div className="mb-1 h-1.5 w-full rounded-sm bg-muted">
                      <div
                        className={`h-1.5 rounded-sm transition-all ${
                          pct === 100
                            ? "bg-foreground"
                            : pct >= 50
                              ? "bg-brand-gold"
                              : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex gap-2 mt-1">
                      {hasBlocked && (
                        <span className="text-overline text-destructive flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {t("catechumens.detail_blocked")}
                        </span>
                      )}
                      {hasWaiting && (
                        <span className="text-overline text-brand-gold-muted flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t("catechumens.detail_waiting")}
                        </span>
                      )}
                      {!hasBlocked && !hasWaiting && pct === 100 && (
                        <span className="text-overline text-brand-ink flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t("catechumens.detail_ready")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Pastoral Analysis Card */}
        {tab === "sacraments" && profile.enrollments?.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-brand-ink" />
                {tpa("title")}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            {profile.enrollments.length > 1 && (
              <select
                className="w-full rounded-sm border border-border/70 bg-white px-3 py-2 text-sm mb-3"
                value={selectedAnalysisClassId || ""}
                onChange={(e) =>
                  setSelectedAnalysisClassId(e.target.value || null)
                }
              >
                <option value="">{tpa("selectClass")}</option>
                {profile.enrollments.map((enr: any) => (
                  <option key={enr.id} value={enr.classId}>
                    {enr.class?.name || enr.classId}{" "}
                    {enr.status !== "ENROLLED" ? `(${enr.status})` : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedAnalysisClassId && (
              <PastoralAnalysisInline
                catechumenId={id!}
                classId={selectedAnalysisClassId}
              />
            )}
          </div>
        )}

        {tab === "documents" && profile.documents?.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <FileText className="h-4 w-4" />
                {t("catechumens.detail_documents_count", {
                  count: profile.documents.length,
                })}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            <div className="space-y-1">
              {profile.documents.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <button
                    onClick={() => handleDownloadDocument(d.id, d.name)}
                    className="text-brand-ink hover:underline flex items-center gap-1 text-left"
                  >
                    <Download className="h-3 w-3" />
                    {d.name}
                  </button>
                  <Badge
                    variant={d.verifiedAt ? "default" : "secondary"}
                    className="text-overline"
                  >
                    {d.verifiedAt
                      ? t("catechumens.detail_verified")
                      : t("pending")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "documents" && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <FilePlus className="h-4 w-4" />
                {t("documents.title")}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            {!showDocUpload ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDocUpload(true)}
              >
                <FilePlus className="mr-1 h-3 w-3" />
                {t("catechumens.detail_new_document")}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="h-9 rounded-sm border border-input bg-background px-3 text-sm flex-1"
                  >
                    {Object.entries(DOC_TYPE_SHORT_KEYS).map(
                      ([value, i18nKey]) => (
                        <option key={value} value={value}>
                          {t(`catechumens.doc_types.${i18nKey}`)}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleDocUpload}
                    disabled={uploading || !docFile}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    {uploading
                      ? t("catechumens.detail_sending")
                      : t("catechumens.detail_send")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowDocUpload(false);
                      setDocFile(null);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            )}
            {profile.documents?.length === 0 && !showDocUpload && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("catechumens.detail_no_documents_hint")}
              </p>
            )}
          </div>
        )}

        {tab === "documents" && canEdit && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Link2 className="h-4 w-4" />
                {t("catechumens.detail_upload_link_title")}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            {!tokenData ? (
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("catechumens.detail_upload_link_desc")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateToken}
                  disabled={generatingToken}
                >
                  {generatingToken
                    ? t("catechumens.detail_generating_link")
                    : t("catechumens.detail_generate_link")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={getUploadLink()}
                    readOnly
                    className="flex-1 h-9 rounded-sm border border-input bg-muted/30 px-3 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    <Copy className="mr-1 h-3 w-3" />
                    {t("catechumens.detail_copy")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("catechumens.detail_link_valid_until", {
                    date: tokenData.expires,
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-destructive">
              {t("catechumens.delete_title")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("catechumens.delete_confirm_desc")}
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {t("delete")}
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteCatechumen}
        loading={deleting}
        variant="destructive"
        title={t("catechumens.delete_title")}
        description={t("catechumens.delete_confirm_desc")}
        confirmLabel={t("delete")}
      />
    </>
  );
}
