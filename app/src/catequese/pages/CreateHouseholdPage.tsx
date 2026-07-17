import { useNavigate } from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { createHousehold } from "wasp/client/operations";
import PhoneMaskInput from "../../client/components/PhoneMaskInput";
import { useViaCep } from "../../client/hooks/useViaCep";
import { useUnsavedChangesGuard } from "../../client/hooks/useUnsavedChangesGuard";
import {
  createHouseholdSchema,
  type CreateHouseholdValues,
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
import { useActiveParish } from "../../client/hooks/useActiveParish";

export default function CreateHouseholdPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { activeParishId } = useActiveParish();

  const form = useForm<CreateHouseholdValues>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: { name: "", address: "", phone: "" },
  });

  const leaveGuard = useUnsavedChangesGuard(
    form.formState.isDirty && !form.formState.isSubmitting,
  );

  const cep = form.watch("address");
  const { data: cepData, loading: cepLoading } = useViaCep(cep || "");

  useEffect(() => {
    if (cepData) {
      const parts = [
        cepData.street,
        cepData.neighborhood && `- ${cepData.neighborhood}`,
        cepData.city && `- ${cepData.city}/${cepData.state}`,
      ].filter(Boolean);
      if (parts.length > 0) {
        form.setValue("address", parts.join(" "), { shouldDirty: true });
      }
    }
  }, [cepData, form]);

  const onSubmit = async (values: CreateHouseholdValues) => {
    try {
      await createHousehold({
        name: values.name,
        address: values.address || undefined,
        phone: values.phone || undefined,
        // Bind new family to the workspace currently selected in the shell
        parishId: activeParishId || undefined,
      });
      form.reset(values);
      navigate("/app/families");
    } catch (err: any) {
      form.setError("root", {
        message: err.message || t("families.create_error"),
      });
    }
  };

  const goBack = () =>
    leaveGuard.confirmLeave(() => navigate("/app/families"));

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <AppPageHeader
        eyebrow={t("families.create_title")}
        title={t("families.create_title")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-10 min-h-11 rounded-sm"
            type="button"
            onClick={goBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("back")}
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
                  <FormLabel>{t("families.name_label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("families.name_placeholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("address")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={t("families.address_placeholder")}
                        {...field}
                      />
                      {cepLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phone")}</FormLabel>
                  <FormControl>
                    <PhoneMaskInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder={t("phone_placeholder")}
                      className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                    />
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
            className="min-h-11 flex-1 rounded-sm"
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            <Save className="mr-2 h-4 w-4" />
            {form.formState.isSubmitting ? t("saving") : t("register")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-sm"
            onClick={goBack}
          >
            {t("cancel")}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={leaveGuard.dialogOpen}
        onOpenChange={leaveGuard.setDialogOpen}
        title={t("leave_form_title")}
        description={t("leave_form_desc")}
        confirmLabel={t("leave_anyway")}
        variant="destructive"
        onConfirm={leaveGuard.onConfirmLeave}
      />
    </div>
  );
}
