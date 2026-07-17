import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { createClass } from "wasp/client/operations";
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

export default function CreateClassPage() {
  const { t } = useTranslation("classes");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { workspaceId, workspacePlan, isPersonal } = useActiveWorkspace();

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

  const leaveGuard = useUnsavedChangesGuard(
    form.formState.isDirty && !form.formState.isSubmitting,
  );

  const onSubmit = async (values: CreateClassValues) => {
    try {
      await createClass({
        ...values,
        parishId: workspaceId,
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

  const goBack = () =>
    leaveGuard.confirmLeave(() => navigate("/app/classes"));

  return (
    <div className="mx-auto max-w-lg space-y-8">
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
        <div className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive">
          {form.formState.errors.root.message}
        </div>
      )}

      <AppPanel>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">{tc("select_option")}</option>
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                          <option key={i} value={i}>
                            {t(`days.${i}`)}
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
                      <Input type="time" {...field} />
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
                      <Input type="time" {...field} />
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

            <div className="h-20 md:h-4" aria-hidden />
          </form>
        </Form>
      </AppPanel>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-border/70 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:static md:inset-auto md:bottom-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-lg gap-3 md:pt-2">
          <Button
            type="button"
            className="min-h-11 flex-1 rounded-sm shadow-none"
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            <Save className="mr-2 h-4 w-4" />
            {form.formState.isSubmitting ? tc("loading") : t("create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-sm"
            onClick={goBack}
          >
            {tc("cancel")}
          </Button>
        </div>
      </div>

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
