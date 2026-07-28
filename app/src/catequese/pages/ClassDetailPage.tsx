import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  AppMetric,
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import {
  ArrowLeft,
  UserPlus,
  Users,
  MapPin,
  Clock,
  ClipboardList,
  TrendingUp,
  XCircle,
  Calendar,
  MessageCircle,
  BookOpen,
  Building2,
  Pencil,
  Check,
  X,
  Trash2,
  Cross,
  BarChart3,
} from "lucide-react";
import {
  useQuery,
  getClassDetails,
  listCatechumens,
  enrollCatechumen,
  updateClass,
  getOrCreateClassChat,
  cancelEnrollment,
  addAssistantCatechist,
  removeCatechistFromClass,
  listParishCatechists,
  getMonthlyPlan,
  inviteUserToParish,
} from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import {
  getPlanLimits,
  getEffectiveBillingPlan,
  getPersonalPlanId,
  isBillingActive,
} from "../../shared/planLimits";
import { PlanLimitBanner } from "../components/PlanLimitBanner";
import { handlePlanLimitError } from "../lib/planLimitToast";
import { canManageWorkspaceBilling } from "../../shared/billingAccess";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { toast } from "../../client/hooks/use-toast";
import SendAnnouncementButton from "../components/SendAnnouncementButton";
import { DetailTabs } from "../../client/components/DetailTabs";
import { useDetailTab } from "../../client/hooks/useDetailTab";

const CLASS_DETAIL_TABS = [
  "inscritos",
  "encontros",
  "catequistas",
  "planejamento",
] as const;
import { EmptyState } from "../../client/components/EmptyState";
import { useClassStatusMap } from "../../i18n/useLabels";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";

export default function ClassDetailPage() {
  const { t } = useTranslation("classes");
  const { t: tc } = useTranslation("common");
  const classStatusMap = useClassStatusMap();
  const { currentLocale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: cls,
    isLoading: loading,
    error: classError,
    refetch: refetchClass,
  } = useQuery(getClassDetails, { id: id! });
  const { data: user } = useAuth();
  const { userRole, parishId, isAdmin } = useUserContext();
  const [tab, setTab] = useDetailTab(CLASS_DETAIL_TABS, "inscritos");

  const isCoordinator = [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "PERSONAL_OWNER",
  ].includes(userRole);
  const isLeadCatechist = !!(cls?.catechists || []).find(
    (cc: any) => cc.userId === user?.id && cc.role === "LEAD",
  );
  const isClassCatechist = !!(cls?.catechists || []).find(
    (cc: any) => cc.userId === user?.id,
  );
  const canEnroll = isCoordinator || isClassCatechist;

  const { data: allCatechumens = [] } = useQuery(
    listCatechumens,
    {
      take: 200,
      workspaceId: cls?.parish?.id || undefined,
    } as any,
    { enabled: tab === "inscritos" && canEnroll && Boolean(cls?.parish?.id) },
  );
  const { availableParishes, isPersonal } = useActiveParish();
  const canManageBilling = canManageWorkspaceBilling(userRole, {
    isPersonalOwner: isPersonal,
    isAdmin,
  });
  const { data: parishCatechists = [] } = useQuery(
    listParishCatechists,
    { parishId: cls?.parish?.id || "" },
    { enabled: !!cls?.parish?.id && tab === "catequistas" },
  );
  const [monthlyPlan, setMonthlyPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [unenrollConfirm, setUnenrollConfirm] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null);
  const [removeCatechistTarget, setRemoveCatechistTarget] = useState<
    string | null
  >(null);
  const [showAddCatechist, setShowAddCatechist] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addingCatechist, setAddingCatechist] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "LEAD_CATECHIST" | "ASSISTANT_CATECHIST"
  >("ASSISTANT_CATECHIST");
  const [invitingByEmail, setInvitingByEmail] = useState(false);
  const [lastClassInviteUrl, setLastClassInviteUrl] = useState<string | null>(
    null,
  );

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDay, setEditDay] = useState("6");
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("10:30");
  const [editLocation, setEditLocation] = useState("");
  const [editCapacity, setEditCapacity] = useState(30);
  const [savingEdit, setSavingEdit] = useState(false);

  const statusOpts = useMemo(
    () => [
      {
        status: "ACTIVE",
        label: t("detail.activate"),
        variant: "default" as const,
      },
      {
        status: "PAUSED",
        label: t("detail.pause"),
        variant: "outline" as const,
      },
      {
        status: "CONCLUDED",
        label: t("detail.conclude"),
        variant: "outline" as const,
      },
    ],
    [t],
  );

  const dayOptions = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((i) => ({
        value: String(i),
        label: t(`days_long.${i}`),
      })),
    [t],
  );

  const parishBilling = availableParishes.find(
    (p: any) => p.id === cls?.parish?.id,
  )?.billing;
  // Personal workspaces: use the user's personal subscription plan.
  // Institutional workspaces: use parish/umbrella TenantBilling.
  const effectivePlan = isPersonal
    ? getPersonalPlanId(user)
    : getEffectiveBillingPlan(parishBilling);
  const limits = getPlanLimits(effectivePlan);
  const isParishManaged =
    !isPersonal && !user?.subscriptionPlan && isBillingActive(parishBilling);

  useEffect(() => {
    if (cls) {
      setEditName(cls.name || "");
      setEditDay(cls.dayOfWeek || "6");
      setEditStart(cls.startTime || "09:00");
      setEditEnd(cls.endTime || "10:30");
      setEditLocation(cls.location || "");
      setEditCapacity(cls.maxCapacity || 30);
    }
  }, [cls]);

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await updateClass({
        id,
        name: editName.trim(),
        dayOfWeek: editDay,
        startTime: editStart,
        endTime: editEnd,
        location: editLocation || undefined,
        maxCapacity: editCapacity,
      });
      toast({ title: t("updated_success") });
      setEditing(false);
    } catch (e: any) {
      toast({
        title: t("update_error"),
        description: e.message || tc("try_again"),
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEnroll = async (cid: string) => {
    try {
      await enrollCatechumen({ classId: id!, catechumenProfileId: cid });
      toast({ title: t("detail.enrolled_success") });
      refetchClass();
    } catch (e: any) {
      if (
        handlePlanLimitError(e.message || e, {
          currentPlan: effectivePlan,
          isPersonalWorkspace: isPersonal,
        })
      )
        return;
      toast({
        title: t("detail.enroll_error"),
        description: (e as any).message || tc("try_again"),
        variant: "destructive",
      });
    }
  };
  const handleUnenroll = (enrollmentId: string) => {
    setUnenrollConfirm(enrollmentId);
  };
  const confirmUnenroll = async () => {
    if (!unenrollConfirm || !id) return;
    const enrollmentId = unenrollConfirm;
    setUnenrollConfirm(null);
    try {
      await cancelEnrollment({ enrollmentId });
      toast({ title: t("detail.unenrolled_success") });
      refetchClass();
    } catch (e: any) {
      if (
        handlePlanLimitError(e.message || e, {
          currentPlan: effectivePlan,
          isPersonalWorkspace: isPersonal,
        })
      )
        return;
      toast({
        title: t("detail.unenroll_error"),
        description: (e as any).message || tc("try_again"),
        variant: "destructive",
      });
    }
  };
  const handleStatus = async (status: string) => {
    if (status === "CONCLUDED") {
      setStatusConfirm(status);
    } else {
      await updateClass({ id, status });
      toast({
        title:
          status === "ACTIVE"
            ? t("detail.activated_success")
            : t("detail.paused_success"),
      });
      refetchClass();
    }
  };
  const confirmStatus = async () => {
    if (!statusConfirm) return;
    const status = statusConfirm;
    setStatusConfirm(null);
    await updateClass({ id, status });
    toast({ title: t("detail.concluded_success") });
  };
  const handleOpenChat = async () => {
    setChatting(true);
    try {
      const { conversationId } = await getOrCreateClassChat({ classId: id! });
      navigate(`/app/messages?c=${conversationId}`);
    } catch (e: any) {
      toast({
        title: t("detail.open_chat_error"),
        description: tc("try_again"),
        variant: "destructive",
      });
    } finally {
      setChatting(false);
    }
  };

  const handleLoadMonthlyPlan = async () => {
    if (monthlyPlan || loadingPlan) return;
    setLoadingPlan(true);
    try {
      const plan = await getMonthlyPlan({ classId: id! });
      setMonthlyPlan(plan);
    } catch (e: any) {
      toast({
        title: t("detail.load_planning_error"),
        description: e.message,
        variant: "destructive",
      });
    }
    setLoadingPlan(false);
  };

  const handleAddCatechist = async () => {
    if (!addUserId) return;
    setAddingCatechist(true);
    try {
      await addAssistantCatechist({ classId: id!, userId: addUserId });
      toast({ title: t("detail.catechist_added") });
      setAddUserId("");
      setShowAddCatechist(false);
      refetchClass();
    } catch (e: any) {
      toast({
        title: t("detail.error"),
        description: e.message || t("detail.add_error"),
        variant: "destructive",
      });
    } finally {
      setAddingCatechist(false);
    }
  };

  const handleInviteCatechistByEmail = async () => {
    if (!inviteEmail.trim() || !cls?.parish?.id) return;
    setInvitingByEmail(true);
    setLastClassInviteUrl(null);
    try {
      const result: any = await inviteUserToParish({
        email: inviteEmail.trim(),
        parishId: cls.parish.id,
        role: inviteRole,
        classId: id!,
      });
      if (result?.inviteUrl) setLastClassInviteUrl(result.inviteUrl);
      const delivery = result?.emailDelivery as string | undefined;
      if (delivery === "sent") {
        toast({ title: t("detail.invite_email_sent") });
      } else if (delivery === "not_configured" || delivery === "failed") {
        toast({
          title: t("detail.invite_saved_copy_link"),
          variant: "destructive",
        });
      } else {
        toast({ title: t("detail.invite_email_sent") });
      }
      setInviteEmail("");
    } catch (e: any) {
      toast({
        title: t("detail.error"),
        description: e.message || t("detail.add_error"),
        variant: "destructive",
      });
    } finally {
      setInvitingByEmail(false);
    }
  };

  const handleRemoveCatechist = async () => {
    if (!removeCatechistTarget) return;
    try {
      await removeCatechistFromClass({
        classId: id!,
        userId: removeCatechistTarget,
      });
      toast({ title: t("detail.catechist_removed") });
      setRemoveCatechistTarget(null);
      refetchClass();
    } catch (e: any) {
      toast({
        title: t("detail.error"),
        description: e.message || t("detail.remove_error"),
        variant: "destructive",
      });
    }
  };

  const canManageClass = isCoordinator || isLeadCatechist;
  const canManageCatechists = isCoordinator || isLeadCatechist;

  const classCatechistUserIds = new Set(
    (cls?.catechists || []).map((cc: any) => cc.userId),
  );
  const availableCatechists = parishCatechists.filter(
    (m: any) => !classCatechistUserIds.has(m.userId),
  );

  const catechistRoleLabel = (role: string) => {
    if (role === "LEAD_CATECHIST") return t("detail.role_lead_catechist");
    if (role === "ASSISTANT_CATECHIST") return t("detail.role_assistant");
    return t("detail.role_coordinator");
  };

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-sm bg-muted" />
          ))}
        </div>
      </div>
    );
  if (!cls) {
    const errMsg = classError
      ? (classError as any)?.message || String(classError)
      : t("not_found");
    return <div className="p-6 text-destructive">{errMsg}</div>;
  }

  const enrolled = cls.enrollments || [];
  const enrolledIds = enrolled.map((e: any) => e.catechumenProfile?.id);
  const available = allCatechumens.filter(
    (c: any) => !enrolledIds.includes(c.id),
  );

  const isCatechumenLimitReached =
    limits.maxCatechumens !== null && enrolled.length >= limits.maxCatechumens;

  let attendanceRate = 0;
  if (cls.meetings?.length) {
    const total = cls.meetings.reduce(
      (s: number, m: any) => s + (m.attendance?.length || 0),
      0,
    );
    const present = cls.meetings.reduce(
      (s: number, m: any) =>
        s +
        (m.attendance?.filter((a: any) => a.status === "PRESENT")?.length || 0),
      0,
    );
    if (total > 0) attendanceRate = Math.round((present / total) * 100);
  }

  const statusBadge = classStatusMap[cls.status as keyof typeof classStatusMap];

  const classSubtitle = [
    statusBadge?.label || cls.status,
    cls.stage?.name,
    cls.community?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-sm"
            asChild
          >
            <Link to="/app/classes" aria-label={tc("back")}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <AppPageHeader
            className="min-w-0 flex-1 border-0 pb-0"
            eyebrow={t("title")}
            title={cls.name}
            subtitle={classSubtitle}
            primaryAction={{
              label: t("attendance"),
              href: `/app/classes/${id}/attendance`,
            }}
            secondaryActions={[
              {
                label: t("detail.tabs.meetings"),
                href: `/app/classes/${id}/meetings`,
              },
              {
                label: t("indicators"),
                href: `/app/classes/${id}/reports`,
              },
              {
                label: chatting ? tc("loading") : t("detail.chat"),
                onClick: handleOpenChat,
                disabled: chatting,
              },
              ...(canManageClass
                ? statusOpts
                    .filter((s) => s.status !== cls.status)
                    .map((s) => ({
                      label: s.label,
                      onClick: () => handleStatus(s.status),
                    }))
                : []),
            ]}
          />
        </div>

        {canManageClass && (
          <div className="flex flex-wrap gap-2">
            <SendAnnouncementButton classId={id!} className={cls.name} />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <AppPanel className="px-4 py-3" padded={false}>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {t("location")}
            </p>
            <p className="font-brand-display mt-1.5 text-sm font-semibold tracking-tight text-brand-ink">
              {cls.location || "—"}
            </p>
          </AppPanel>
          <AppPanel className="px-4 py-3" padded={false}>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {t("schedule")}
            </p>
            <p className="font-brand-display mt-1.5 text-sm font-semibold tracking-tight text-brand-ink">
              {t(`days_long.${cls.dayOfWeek}`) || cls.dayOfWeek} {cls.startTime}
              {cls.endTime && `-${cls.endTime}`}
            </p>
          </AppPanel>
          <AppMetric
            label={t("enrolled")}
            value={`${enrolledIds.length}/${cls.maxCapacity}`}
          />
          <AppMetric
            label={t("attendance")}
            value={`${attendanceRate}%`}
            href={`/app/classes/${id}/attendance`}
          />
        </div>

        {editing ? (
          <AppPanel className="p-4 space-y-3" padded={false}>
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Pencil className="h-3.5 w-3.5" />
                {t("detail.edit_class")}
              </p>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">{t("name")}</label>
                <input
                  aria-label={t("name")}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">
                  {t("detail.day_of_week")}
                </label>
                <select
                  aria-label={t("detail.day_of_week")}
                  value={editDay}
                  onChange={(e) => setEditDay(e.target.value)}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                >
                  {dayOptions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">
                  {t("detail.slots")}
                </label>
                <input
                  aria-label={t("detail.slots")}
                  type="number"
                  min={1}
                  max={200}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">{t("start")}</label>
                <input
                  aria-label={t("start")}
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">
                  {t("detail.end_time")}
                </label>
                <input
                  aria-label={t("detail.end_time")}
                  type="time"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">{t("location")}</label>
                <input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                  placeholder={cls.location || t("location_placeholder")}
                  aria-label={t("location")}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                <X className="mr-1 h-3 w-3" />
                {t("detail.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={savingEdit || !editName.trim()}
              >
                <Check className="mr-1 h-3 w-3" />
                {savingEdit ? tc("saving") : t("detail.save")}
              </Button>
            </div>
          </AppPanel>
        ) : (
          canManageClass && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-3 w-3" />
                {t("detail.edit_class_btn")}
              </Button>
            </div>
          )
        )}

        <DetailTabs
          tabs={[
            {
              id: "inscritos",
              label: t("detail.tab_enrolled", { count: enrolledIds.length }),
            },
            {
              id: "encontros",
              label: t("detail.tab_meetings", {
                count: cls.meetings?.length || 0,
              }),
            },
            {
              id: "catequistas",
              label: t("detail.tab_catechists", {
                count: cls.catechists?.length || 0,
              }),
            },
            { id: "planejamento", label: t("detail.tabs.planning") },
          ]}
          value={tab}
          onChange={(tabId) => {
            setTab(tabId as (typeof CLASS_DETAIL_TABS)[number]);
            if (tabId === "planejamento" && !monthlyPlan)
              handleLoadMonthlyPlan();
          }}
        />

        {tab === "inscritos" && (
          <div>
            {enrolled.length === 0 ? (
              <EmptyState
                compact
                icon={Users}
                title={t("detail.no_enrolled")}
                description={t("detail.no_enrolled_next_desc")}
              >
                {canEnroll ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button size="sm" asChild>
                      <Link to="/app/catechumens/new">
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        {t("detail.empty_cta_create_person")}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/classes/${id}/attendance`}>
                        <ClipboardList className="mr-1 h-3.5 w-3.5" />
                        {t("detail.empty_cta_attendance")}
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </EmptyState>
            ) : (
              <div className="grid gap-2">
                {enrolled.map((e: any) => {
                  const journeys =
                    e.catechumenProfile?.sacramentalJourneys || [];
                  const relevantJourney = cls.sacrament?.id
                    ? journeys.find(
                        (j: any) =>
                          j.template?.sacramentId === cls.sacrament?.id,
                      ) || journeys[0]
                    : journeys[0];
                  const total = relevantJourney?.milestones?.length || 0;
                  const done =
                    relevantJourney?.milestones?.filter(
                      (m: any) =>
                        m.status === "COMPLETED" || m.status === "APPROVED",
                    )?.length || 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const journeyBadge = relevantJourney ? (
                    <Badge
                      variant={pct === 100 ? "default" : "outline"}
                      className="gap-1 text-overline"
                    >
                      <Cross className="h-3 w-3" />
                      {done}/{total}
                    </Badge>
                  ) : cls.sacrament ? (
                    <span className="flex items-center gap-1 text-overline text-muted-foreground">
                      <Cross className="h-3 w-3 opacity-50" />
                      {t("detail.no_journey")}
                    </span>
                  ) : null;

                  return (
                    <AppPanel
                      key={e.id}
                      className="flex min-h-14 items-center justify-between gap-2 p-3"
                      padded={false}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Link
                          to={`/app/catechumens/${e.catechumenProfile?.id}`}
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-sm hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-xs font-semibold text-brand-ink">
                            {e.catechumenProfile?.firstName?.[0]}
                            {e.catechumenProfile?.lastName?.[0]}
                          </div>
                          <span className="font-brand-display truncate text-sm font-semibold tracking-tight text-brand-ink">
                            {e.catechumenProfile?.firstName}{" "}
                            {e.catechumenProfile?.lastName}
                          </span>
                        </Link>
                        {relevantJourney ? (
                          <Link
                            to={`/app/sacramental-journeys/${relevantJourney.id}`}
                            className="shrink-0"
                          >
                            {journeyBadge}
                          </Link>
                        ) : (
                          journeyBadge && (
                            <span className="shrink-0">{journeyBadge}</span>
                          )
                        )}
                      </div>
                      {canEnroll && (
                        <button
                          type="button"
                          onClick={() => handleUnenroll(e.id)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={tc("delete")}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </AppPanel>
                  );
                })}
              </div>
            )}
            {isCatechumenLimitReached ? (
              <div className="mt-6">
                <PlanLimitBanner
                  type="catechumen_limit"
                  currentCount={enrolled.length}
                  userPlan={effectivePlan}
                  isParishManaged={isParishManaged}
                  isPersonalWorkspace={isPersonal}
                  canManageBilling={canManageBilling}
                />
              </div>
            ) : (
              available.length > 0 &&
              canEnroll && (
                <div className="mt-6">
                  <div className="mb-2 space-y-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("detail.available_to_enroll", {
                        count: available.length,
                      })}
                    </h3>
                    <div className="h-px w-8 bg-brand-gold" aria-hidden />
                  </div>
                  <div className="grid gap-2">
                    {available.map((c: any) => (
                      <AppPanel
                        key={c.id}
                        className="flex items-center justify-between p-3"
                        padded={false}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-xs font-semibold text-brand-ink">
                            {c.firstName?.[0]}
                            {c.lastName?.[0]}
                          </div>
                          <span className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
                            {c.firstName} {c.lastName}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 min-h-11 shrink-0 rounded-sm"
                          onClick={() => handleEnroll(c.id)}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          {t("detail.enroll_btn")}
                        </Button>
                      </AppPanel>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {tab === "encontros" && (
          <div>
            {!cls.meetings?.length ? (
              <EmptyState
                compact
                icon={Calendar}
                title={t("detail.no_meetings_registered")}
                description={t("detail.schedule_meetings_next_desc")}
              >
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" asChild>
                    <Link to="/app/ai-hub">
                      <BookOpen className="mr-1 h-3.5 w-3.5" />
                      {t("detail.empty_cta_prepare_meeting")}
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/app/classes/${id}/attendance`}>
                      <ClipboardList className="mr-1 h-3.5 w-3.5" />
                      {t("detail.empty_cta_attendance")}
                    </Link>
                  </Button>
                </div>
              </EmptyState>
            ) : (
              <div className="grid gap-2">
                {cls.meetings.map((m: any) => (
                  <AppPanel
                    key={m.id}
                    className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                    padded={false}
                  >
                    <div className="min-w-0">
                      <p className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
                        {m.title || t("detail.no_title")}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(m.date, currentLocale)}
                        </p>
                        {m.content ? (
                          <Link
                            to={`/app/content-library/${m.content.id}`}
                            className="flex min-h-9 items-center gap-1 text-xs font-medium text-brand-ink underline-offset-2 hover:underline"
                          >
                            <BookOpen className="h-3 w-3" />
                            {m.content.title}
                          </Link>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            {t("detail.no_material")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-overline">
                        {t("detail.attendance_records", {
                          count: m._count?.attendance || 0,
                        })}
                      </Badge>
                      <Button
                        size="sm"
                        className="h-11 min-h-11 rounded-sm"
                        asChild
                      >
                        <Link
                          to={`/app/classes/${id}/attendance?meetingId=${m.id}`}
                        >
                          <ClipboardList className="mr-1 h-3.5 w-3.5" />
                          {t("attendance")}
                        </Link>
                      </Button>
                    </div>
                  </AppPanel>
                ))}
              </div>
            )}
            {canManageClass && (
              <Button
                className="mt-4 h-11 min-h-11"
                size="sm"
                asChild
                variant="outline"
              >
                <Link to={`/app/classes/${id}/meetings`}>
                  <Calendar className="mr-1 h-3 w-3" />
                  {t("detail.manage_meetings")}
                </Link>
              </Button>
            )}
          </div>
        )}

        {tab === "catequistas" && (
          <div className="space-y-4">
            {canManageCatechists && (
              <div>
                {!showAddCatechist ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCatechist(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t("detail.add_catechist")}
                  </Button>
                ) : (
                  <AppPanel
                    className="flex items-center gap-2 p-3"
                    padded={false}
                  >
                    <select
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm"
                    >
                      <option value="">{t("detail.select_catechist")}</option>
                      {availableCatechists.map((m: any) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user?.firstName} {m.user?.lastName} —{" "}
                          {catechistRoleLabel(m.role)}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleAddCatechist}
                      disabled={!addUserId || addingCatechist}
                    >
                      {addingCatechist ? tc("loading") : t("detail.add")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddCatechist(false);
                        setAddUserId("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AppPanel>
                )}
                {availableCatechists.length === 0 && showAddCatechist && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("detail.all_catechists_linked")}
                  </p>
                )}
                {canManageCatechists && (
                  <div className="mt-3 space-y-2 rounded-sm border border-dashed border-border/70 bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("detail.invite_by_email")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder={t("detail.invite_email_placeholder")}
                        aria-label={t("detail.invite_email_placeholder")}
                        className="flex-1 min-w-0 sm:min-w-[180px] h-9 rounded-sm border border-input bg-background px-3 text-sm"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(
                            e.target.value as
                              | "LEAD_CATECHIST"
                              | "ASSISTANT_CATECHIST",
                          )
                        }
                        className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
                      >
                        <option value="ASSISTANT_CATECHIST">
                          {t("detail.role_assistant")}
                        </option>
                        <option value="LEAD_CATECHIST">
                          {t("detail.role_lead_catechist")}
                        </option>
                      </select>
                      <Button
                        size="sm"
                        onClick={handleInviteCatechistByEmail}
                        disabled={!inviteEmail.trim() || invitingByEmail}
                      >
                        {invitingByEmail
                          ? tc("loading")
                          : t("detail.send_invite")}
                      </Button>
                    </div>
                    {lastClassInviteUrl && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="truncate text-muted-foreground flex-1 min-w-0">
                          {lastClassInviteUrl}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                lastClassInviteUrl,
                              );
                              toast({ title: tc("team.link_copied") });
                            } catch {
                              /* ignore */
                            }
                          }}
                        >
                          {tc("team.copy_link")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!cls.catechists?.length ? (
              <EmptyState
                compact
                icon={Users}
                title={t("detail.no_catechists_linked")}
                description={t("detail.no_catechists_desc")}
              />
            ) : (
              <div className="grid gap-2 ">
                {cls.catechists.map((cc: any) => {
                  const canRemove =
                    isCoordinator ||
                    (isLeadCatechist && cc.role === "ASSISTANT") ||
                    (cc.userId === user?.id && cc.role === "ASSISTANT");
                  return (
                    <AppPanel
                      key={cc.id}
                      className="flex items-center justify-between p-3"
                      padded={false}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-xs font-semibold text-brand-ink flex-shrink-0">
                          {cc.user?.firstName?.[0]}
                          {cc.user?.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-brand-display truncate text-sm font-semibold tracking-tight text-brand-ink">
                            {cc.user?.firstName} {cc.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cc.user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={cc.role === "LEAD" ? "default" : "secondary"}
                        >
                          {cc.role === "LEAD"
                            ? t("detail.role_lead")
                            : t("detail.role_assistant")}
                        </Badge>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveCatechistTarget(cc.userId)}
                            aria-label={tc("delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </AppPanel>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "planejamento" && (
          <div>
            {loadingPlan ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Clock className="h-4 w-4 animate-spin" />
                {t("detail.loading_planning")}
              </div>
            ) : monthlyPlan ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-sm border border-border/70 bg-muted/30 p-2 text-brand-ink">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
                      {formatDate(
                        new Date(monthlyPlan.year, monthlyPlan.month),
                        currentLocale,
                        { month: "long", year: "numeric" },
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("detail.meetings_this_month", {
                        count: monthlyPlan.totalMeetings,
                      })}
                    </p>
                  </div>
                </div>

                {monthlyPlan.weeks?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {t("detail.no_meetings_this_month")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {monthlyPlan.weeks?.map((week: any, wi: number) => (
                      <AppPanel key={wi} className="p-3" padded={false}>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {t("detail.week_of", {
                            date: formatDate(week.weekStart, currentLocale, {
                              day: "numeric",
                              month: "short",
                            }),
                          })}
                        </p>
                        <div className="space-y-1">
                          {week.meetings.map((m: any) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between py-1 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-overline"
                                >
                                  {formatDate(m.date, currentLocale, {
                                    weekday: "short",
                                    day: "numeric",
                                  })}
                                </Badge>
                                <span className="font-brand-display font-semibold tracking-tight text-brand-ink">
                                  {m.title || t("detail.no_title")}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {t("detail.attendance_records", {
                                  count: m.attendanceCount,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </AppPanel>
                    ))}
                  </div>
                )}

                {monthlyPlan.availableContent?.length > 0 && (
                  <AppPanel className="p-3" padded={false}>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {t("detail.available_content")}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {monthlyPlan.availableContent
                        .slice(0, 8)
                        .map((c: any) => (
                          <Link
                            key={c.id}
                            to={`/app/content-library/${c.id}`}
                            className="rounded-sm border border-border/70 bg-muted/30 px-2 py-1 text-xs transition-colors hover:border-brand-ink/30"
                          >
                            {c.title}
                          </Link>
                        ))}
                    </div>
                  </AppPanel>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                {t("detail.planning_load_failed")}
              </p>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!unenrollConfirm}
        onOpenChange={(open) => {
          if (!open) setUnenrollConfirm(null);
        }}
        title={t("detail.confirm_unenroll_title")}
        description={t("detail.confirm_unenroll_desc")}
        confirmLabel={t("detail.unenroll")}
        variant="destructive"
        onConfirm={confirmUnenroll}
      />
      <ConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => {
          if (!open) setStatusConfirm(null);
        }}
        title={t("detail.confirm_conclude_title")}
        description={t("detail.confirm_conclude_desc")}
        confirmLabel={t("detail.confirm_conclude_btn")}
        variant="destructive"
        onConfirm={confirmStatus}
      />
      <ConfirmDialog
        open={!!removeCatechistTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveCatechistTarget(null);
        }}
        title={t("detail.confirm_remove_catechist_title")}
        description={t("detail.confirm_remove_catechist_desc")}
        confirmLabel={t("detail.remove_catechist")}
        variant="destructive"
        onConfirm={handleRemoveCatechist}
      />
    </>
  );
}
