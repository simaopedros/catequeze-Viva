import { useEffect, useMemo, useState } from "react";
import { TimeInput } from "../../client/components/ui/time-input";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import {
  createClass,
  listClasses,
  listCommunities,
  useQuery,
} from "wasp/client/operations";
import { handlePlanLimitError } from "../lib/planLimitToast";
import { toast } from "../../client/hooks/use-toast";
import { useUnsavedChangesGuard } from "../../client/hooks/useUnsavedChangesGuard";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import {
  createClassSchema,
  type CreateClassValues,
} from "../../client/validation/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../client/components/ui/form";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { MobileActionBar } from "../../client/components/MobileActionBar";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import { canManageWorkspaceBilling } from "../../shared/billingAccess";
import { useUserContext } from "../../client/hooks/useUserContext";
import { isInstitutionalWorkspaceType } from "../../shared/workspace";
import {
  countActiveClasses,
  isClassPlanLimitReached,
} from "../../shared/classPlanLimit";
import { buildBillingJourneyHrefFromContext } from "../lib/upgradeJourney";

export default function CreateClassPage() {
  const { t } = useTranslation("classes");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { workspaceId, workspacePlan, isPersonal, availableWorkspaces } =
    useActiveWorkspace();
  const { getBySlug, localize } = usePlanCatalog();
  const { userRole, isAdmin } = useUserContext();
  const canManageBilling = canManageWorkspaceBilling(userRole, {
    isPersonalOwner: isPersonal,
    isAdmin,
  });

  const institutionalParishes = useMemo(
    () =>
      availableWorkspaces.filter(
        (w) => !w.isPersonal && isInstitutionalWorkspaceType(w.type),
      ),
    [availableWorkspaces],
  );

  const [parishId, setParishId] = useState("");
  const [communityId, setCommunityId] = useState("");

  useEffect(() => {
    if (parishId && availableWorkspaces.some((w) => w.id === parishId)) {
      return;
    }
    if (
      !isPersonal &&
      workspaceId &&
      availableWorkspaces.some((w) => w.id === workspaceId)
    ) {
      setParishId(workspaceId);
      return;
    }
    setParishId(institutionalParishes[0]?.id || workspaceId || "");
  }, [
    availableWorkspaces,
    institutionalParishes,
    isPersonal,
    parishId,
    workspaceId,
  ]);

  const targetParishId = parishId || workspaceId;
  const { data: classPage, isLoading: classesLoading } = useQuery(
    listClasses,
    { workspaceId: targetParishId, take: 100, paginated: true } as any,
    { enabled: Boolean(targetParishId) },
  );
  const selectedIsInstitutional = institutionalParishes.some(
    (w) => w.id === targetParishId,
  );
  const { data: communities = [] } = useQuery(
    listCommunities,
    { parishId: targetParishId },
    { enabled: Boolean(targetParishId) && selectedIsInstitutional },
  );
  const existingClasses = Array.isArray(classPage)
    ? classPage
    : (classPage as any)?.items || [];
  const effectivePlan = workspacePlan || "catechist_free";
  const limits = getBySlug(effectivePlan).limits;
  const activeClassesCount = countActiveClasses(existingClasses);
  const limitCheckReady = !targetParishId || !classesLoading;
  const isClassLimitReached =
    Boolean(targetParishId) &&
    limitCheckReady &&
    isClassPlanLimitReached(activeClassesCount, limits.maxClasses);
  const planDisplayName = localize(effectivePlan).name;
  const seePlansHref = buildBillingJourneyHrefFromContext({
    currentPlan: effectivePlan,
    isPersonalWorkspace: isPersonal,
    source: "limit_banner",
    reason: "class_limit",
  });

  const form = useForm<CreateClassValues>({
    resolver: zodResolver(createClassSchema) as any,
    defaultValues: {
      name: "",
      location: "",
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      maxCapacity: 30,
    },
  });

  // Only guard when the create form is mounted and dirty — never for the limit notice.
  const leaveGuard = useUnsavedChangesGuard(
    !isClassLimitReached &&
      form.formState.isDirty &&
      !form.formState.isSubmitting,
  );

  const onSubmit = async (values: CreateClassValues) => {
    try {
      await createClass({
        ...values,
        parishId: targetParishId,
        communityId: communityId || undefined,
      });
      form.reset(values);
      toast({ title: t("created_success") });
      navigate("/app/classes");
    } catch (err: any) {
      if (
        handlePlanLimitError(err.message || err, {
          currentPlan: workspacePlan,
          isPersonalWorkspace: isPersonal,
        })
      )
        return;
      form.setError("root", { message: err.message || t("create_error") });
    }
  };

  const goBack = () => leaveGuard.confirmLeave(() => navigate("/app/classes"));

  if (!limitCheckReady) {
    return (
      <div className="mx-auto max-w-lg space-y-5 sm:space-y-8">
        <AppPageHeader eyebrow={t("create")} title={t("create")} />
        <div className="h-40 animate-pulse rounded-sm bg-muted" />
      </div>
    );
  }

  if (isClassLimitReached) {
    return (
      <div className="mx-auto max-w-lg space-y-5 sm:space-y-8">
        <AppPageHeader
          eyebrow={t("create")}
          title={t("create")}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="h-10 min-h-11 rounded-sm"
              type="button"
              onClick={() => navigate("/app/classes")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {tc("back")}
            </Button>
          }
        />

        <AppPanel className="space-y-4 border-l-2 border-l-brand-ink/60">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("limit_reached_title")}
            </p>
            <div className="h-px w-8 bg-brand-gold" aria-hidden />
            <p className="text-base font-semibold tracking-tight text-brand-ink">
              {t("limit_reached_heading")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {limits.maxClasses === 0
                ? t("limit_reached_none", { planName: planDisplayName })
                : t("limit_reached_body", {
                    currentCount: activeClassesCount,
                    maxAllowed: limits.maxClasses,
                    planName: planDisplayName,
                  })}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canManageBilling ? (
              <Button className="h-11 min-h-11 rounded-sm" asChild>
                <Link to={seePlansHref}>{t("limit_see_plans")}</Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-11 min-h-11 rounded-sm"
              asChild
            >
              <Link to="/app/classes">{t("limit_back_to_classes")}</Link>
            </Button>
          </div>
        </AppPanel>
      </div>
    );
  }

  return (
    <div className="mobile-action-padding mx-auto max-w-lg space-y-5 sm:space-y-8">
      <AppPageHeader
        eyebrow={t("create")}
        title={t("create")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-10 min-h-11 rounded-sm"
            type="button"
            onClick={goBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tc("back")}
          </Button>
        }
      />

      {form.formState.errors.root && (
        <div
          className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {form.formState.errors.root.message}
        </div>
      )}

      <AppPanel>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {(institutionalParishes.length > 0 || selectedIsInstitutional) && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium" htmlFor="class-parish">
                    {t("parish")}
                  </label>
                  {institutionalParishes.length > 0 ? (
                    <select
                      id="class-parish"
                      value={parishId}
                      onChange={(e) => {
                        setParishId(e.target.value);
                        setCommunityId("");
                      }}
                      className="mt-1 flex h-12 min-h-12 w-full rounded-sm border border-input bg-background px-3 py-2 text-base md:h-11 md:min-h-11 md:text-sm"
                    >
                      {institutionalParishes.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("create_parish_first")}{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => navigate("/app/parishes?new=true")}
                      >
                        {t("create_parish_cta")}
                      </button>
                    </p>
                  )}
                </div>
                {communities.length > 0 && (
                  <div>
                    <label
                      className="text-sm font-medium"
                      htmlFor="class-community"
                    >
                      {t("community")}
                    </label>
                    <select
                      id="class-community"
                      value={communityId}
                      onChange={(e) => setCommunityId(e.target.value)}
                      className="mt-1 flex h-12 min-h-12 w-full rounded-sm border border-input bg-background px-3 py-2 text-base md:h-11 md:min-h-11 md:text-sm"
                    >
                      <option value="">{t("community_placeholder")}</option>
                      {communities.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("community_optional")}
                    </p>
                  </div>
                )}
              </div>
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t("name_placeholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("location")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("location_placeholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("day")}</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-12 min-h-12 w-full rounded-sm border border-input bg-background px-3 py-2 text-base md:h-11 md:min-h-11 md:text-sm"
                      >
                        <option value="">{tc("select_option")}</option>
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                          <option key={i} value={i}>
                            {t(`days_long.${i}`)}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("start")}</FormLabel>
                    <FormControl>
                      <TimeInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("end")}</FormLabel>
                    <FormControl>
                      <TimeInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="maxCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("max_capacity")}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </AppPanel>

      <MobileActionBar
        label={form.formState.isSubmitting ? tc("loading") : t("create")}
        loading={form.formState.isSubmitting}
        disabled={form.formState.isSubmitting}
        onClick={form.handleSubmit(onSubmit)}
        icon={<Save className="mr-2 h-4 w-4" />}
      />

      <ConfirmDialog
        open={leaveGuard.dialogOpen}
        onOpenChange={leaveGuard.setDialogOpen}
        title={tc("leave_form_title")}
        description={tc("leave_form_desc")}
        confirmLabel={tc("leave_anyway")}
        variant="destructive"
        onConfirm={leaveGuard.onConfirmLeave}
      />
    </div>
  );
}
