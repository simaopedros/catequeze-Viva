import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "wasp/client/auth";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Badge } from "../../client/components/ui/badge";
import {
  User,
  Globe,
  Bell,
  Shield,
  Save,
  Key,
  Download,
  Church,
  CheckCircle,
  AlertCircle,
  GitMerge,
  RefreshCw,
} from "lucide-react";
import {
  AppEyebrow,
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { useUserContext } from "../../client/hooks/useUserContext";
import {
  updateUserProfile,
  requestDataExport,
  changePassword,
  useQuery,
  listParishes,
  executeParishMigration,
  getMyEmailPreferences,
  updateMyEmailPreferences,
} from "wasp/client/operations";
import { Switch } from "../../client/components/ui/switch";
import { EMAIL_TOPIC } from "../../shared/emailCatalog";
import PhoneMaskInput from "../../client/components/PhoneMaskInput";
import TwoFactorSetup from "../components/TwoFactorSetup";
import { SocialProfileSettings } from "../components/social/SocialProfileSettings";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordValues,
  type UpdateProfileValues,
} from "../../client/validation/schemas";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { useUnsavedChangesGuard } from "../../client/hooks/useUnsavedChangesGuard";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../client/components/ui/form";

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { data: user } = useAuth();
  const { userRole, parishName: ctxParishName } = useUserContext();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Export
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  // Migration (platform admin only)
  const [migrating, setMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState("");
  const [migrationError, setMigrationError] = useState(false);
  const [sourceParishId, setSourceParishId] = useState("");
  const [targetParishId, setTargetParishId] = useState("");
  const [migrationConfirm, setMigrationConfirm] = useState("");
  const { data: userParishes = [] } = useQuery(listParishes);
  const { data: emailPrefs } = useQuery(getMyEmailPreferences);
  const [prefSaving, setPrefSaving] = useState<string | null>(null);
  const [prefSaved, setPrefSaved] = useState(false);

  // Profile form: RHF + zod (PhoneMaskInput is wired through Controller).
  const profileForm = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { firstName: "", lastName: "", phone: "" },
  });
  const profileDirty = profileForm.formState.isDirty;
  const leaveGuard = useUnsavedChangesGuard(profileDirty && !saving);

  useEffect(() => {
    profileForm.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
    });
  }, [user, profileForm]);

  // Password form with Zod
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const handleSaveProfile = profileForm.handleSubmit(async (values) => {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      await updateUserProfile(values);
      profileForm.reset(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || t("save_profile_error"));
    }
    setSaving(false);
  });

  const handleChangePassword = async (values: ChangePasswordValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      passwordForm.setError("root", { message: t("password_changed") });
    } catch (e: any) {
      passwordForm.setError("root", {
        message: e.message || t("password_change_error"),
      });
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setExportMsg("");
    try {
      const result = await requestDataExport({});
      setExportMsg(result.message || t("export_success"));
    } catch (e: any) {
      setExportMsg(
        t("export_error", { message: e.message || t("export_retry") }),
      );
    }
    setExporting(false);
  };

  const handleMigration = async () => {
    if (!sourceParishId || !targetParishId) return;
    if (sourceParishId === targetParishId) {
      setMigrationMsg(t("different_parishes"));
      setMigrationError(true);
      return;
    }
    if (migrationConfirm !== "CONFIRM_MIGRATE") {
      setMigrationMsg(
        t("migration_confirm_required", {
          defaultValue: 'Digite CONFIRM_MIGRATE para confirmar a migração.',
        }),
      );
      setMigrationError(true);
      return;
    }

    setMigrating(true);
    setMigrationMsg("");
    setMigrationError(false);
    try {
      const result = await executeParishMigration({
        sourceParishId,
        targetParishId,
        confirmSourceParishId: sourceParishId,
        confirmTargetParishId: targetParishId,
        confirmation: "CONFIRM_MIGRATE",
      });
      setMigrationMsg(
        t("migration_success", {
          classes: result.migrated.classes,
          households: result.migrated.households,
          members: result.migrated.members,
        }),
      );
      setMigrationError(false);
      setSourceParishId("");
      setTargetParishId("");
      setMigrationConfirm("");
    } catch (e: any) {
      setMigrationMsg(e.message || t("migration_error"));
      setMigrationError(true);
    }
    setMigrating(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <AppPageHeader
        eyebrow={t("eyebrow", { defaultValue: "Conta" })}
        title={t("title")}
        subtitle={`${user?.email || ""} ${
          userRole ? tc(`roles.${userRole}`) || userRole : ""
        }`}
      />

      {ctxParishName && (
        <AppPanel>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("linked_parish")}
          </p>
          <p
            className="mt-1 text-sm font-semibold tracking-tight text-brand-ink"
          >
            {ctxParishName}
          </p>
        </AppPanel>
      )}

      <AppPanel className="space-y-4">
        <AppEyebrow>{t("profile")}</AppEyebrow>
        <Form {...profileForm}>
        <form
          className="space-y-4"
          onSubmit={handleSaveProfile}
          noValidate
        >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={profileForm.control}
            name="firstName"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium">{t("first_name")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("first_name_placeholder")}
                    className="h-10 rounded-sm"
                    autoComplete="given-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={profileForm.control}
            name="lastName"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium">{t("last_name")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("last_name_placeholder")}
                    className="h-10 rounded-sm"
                    autoComplete="family-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={profileForm.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-xs font-medium">{t("phone")}</FormLabel>
              <FormControl>
                <PhoneMaskInput
                  value={field.value}
                  onChange={field.onChange}
                  className="flex h-10 w-full rounded-sm"
                  placeholder={t("phone_placeholder")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {saveError && (
          <p className="text-xs text-destructive flex items-center gap-1" role="alert">
            <AlertCircle className="h-3 w-3" />
            {saveError}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            className="rounded-md"
            disabled={saving || !profileDirty}
            loading={saving}
          >
            <Save className="mr-1 h-3 w-3" />
            {saving ? t("saving") : tc("save")}
          </Button>
          {saved && (
            <span className="text-xs text-success flex items-center gap-1 self-center">
              <CheckCircle className="h-3 w-3" />
              {t("saved")}
            </span>
          )}
        </div>
        </form>
        </Form>
      </AppPanel>

      <SocialProfileSettings />

      <ConfirmDialog
        open={leaveGuard.dialogOpen}
        onOpenChange={leaveGuard.setDialogOpen}
        title={tc("leave_form_title")}
        description={tc("leave_form_desc")}
        confirmLabel={tc("leave_anyway")}
        variant="destructive"
        onConfirm={leaveGuard.onConfirmLeave}
      />

      {/* Password */}
      <AppPanel className="space-y-4">
        <AppEyebrow>{t("change_password")}</AppEyebrow>
        {passwordForm.formState.errors.root && (
          <p
            className={`text-xs flex items-center gap-1 ${
              passwordForm.formState.errors.root.message ===
              t("password_changed")
                ? "text-success"
                : "text-destructive"
            }`}
          >
            {passwordForm.formState.errors.root.message ===
            t("password_changed") ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {passwordForm.formState.errors.root.message}
          </p>
        )}
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(handleChangePassword)}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("current_password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("current_password_placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("new_password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("new_password_placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={passwordForm.formState.isSubmitting}
            >
              <Key className="mr-1 h-3 w-3" />
              {passwordForm.formState.isSubmitting
                ? t("changing_password")
                : t("change_password_btn")}
            </Button>
          </form>
        </Form>
      </AppPanel>

      {/* Two-Factor Authentication */}
      <TwoFactorSetup />

      {/* Data export */}
      <AppPanel className="space-y-3">
        <AppEyebrow className="flex items-center gap-2">
          <Download className="h-3.5 w-3.5" />
          {t("export_data")}
        </AppEyebrow>
        <p className="text-xs text-muted-foreground">{t("export_desc")}</p>
        {exportMsg && (
          <p
            className={`text-xs mb-3 ${
              exportMsg.includes("Erro") ? "text-destructive" : "text-success"
            }`}
          >
            {exportMsg}
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="rounded-sm"
          onClick={handleExportData}
          disabled={exporting}
        >
          <Download className="mr-1 h-3 w-3" />
          {exporting ? t("export_requesting") : t("export_request")}
        </Button>
      </AppPanel>

      {/* Migration — platform admin only (capture-parish vulnerability fix) */}
      {user?.isAdmin && (
        <AppPanel className="space-y-4">
          <AppEyebrow className="flex items-center gap-2">
            <GitMerge className="h-3.5 w-3.5" />
            {t("migration")}
          </AppEyebrow>
          <p className="text-xs text-muted-foreground">
            {t("migration_desc", {
              defaultValue:
                "Somente administrador da plataforma. Confirme origem e destino explicitamente.",
            })}
          </p>
          <div>
            <label htmlFor="source-parish" className="text-xs font-medium">
              {t("source_parish")}
            </label>
            <select
              id="source-parish"
              value={sourceParishId}
              onChange={(e) => setSourceParishId(e.target.value)}
              className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
            >
              <option value="">{t("select_parish")}</option>
              {userParishes
                .filter((p: any) => p.active)
                .map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.city ? ` — ${p.city}/${p.state}` : ""}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="target-parish" className="text-xs font-medium">
              {t("target_parish", { defaultValue: "Paróquia de destino" })}
            </label>
            <select
              id="target-parish"
              value={targetParishId}
              onChange={(e) => setTargetParishId(e.target.value)}
              className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
            >
              <option value="">{t("select_parish")}</option>
              {userParishes
                .filter((p: any) => p.active && p.id !== sourceParishId)
                .map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.city ? ` — ${p.city}/${p.state}` : ""}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="migration-confirm" className="text-xs font-medium">
              {t("migration_confirm_label", {
                defaultValue: 'Digite CONFIRM_MIGRATE',
              })}
            </label>
            <Input
              id="migration-confirm"
              value={migrationConfirm}
              onChange={(e) => setMigrationConfirm(e.target.value)}
              className="mt-1 rounded-sm"
              autoComplete="off"
            />
          </div>
          {migrationMsg && (
            <p
              className={`text-xs flex items-center gap-1 ${
                migrationError ? "text-destructive" : "text-success"
              }`}
            >
              {migrationError ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              {migrationMsg}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleMigration}
            disabled={
              migrating ||
              !sourceParishId ||
              !targetParishId ||
              migrationConfirm !== "CONFIRM_MIGRATE"
            }
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${migrating ? "animate-spin" : ""}`}
            />
            {migrating ? t("migrating") : t("migrate_data")}
          </Button>
        </AppPanel>
      )}

      <AppPanel className="space-y-4">
        <AppEyebrow>{t("email_preferences")}</AppEyebrow>
        <p className="text-xs text-muted-foreground">
          {t("email_preferences_desc")}
        </p>
        {(
          [
            [EMAIL_TOPIC.LIFECYCLE, "email_pref_lifecycle"],
            [EMAIL_TOPIC.PRODUCT_UPDATES, "email_pref_product"],
            [EMAIL_TOPIC.PASTORAL_ANNOUNCEMENTS, "email_pref_pastoral"],
          ] as const
        ).map(([topic, labelKey]) => (
          <div key={topic} className="flex items-center justify-between gap-3">
            <p className="text-sm text-brand-ink">{t(labelKey)}</p>
            <Switch
              checked={emailPrefs?.[topic] !== false}
              disabled={prefSaving === topic}
              onCheckedChange={async (checked) => {
                setPrefSaving(topic);
                try {
                  await updateMyEmailPreferences({ topic, optedIn: checked });
                  setPrefSaved(true);
                  setTimeout(() => setPrefSaved(false), 2500);
                } finally {
                  setPrefSaving(null);
                }
              }}
            />
          </div>
        ))}
        {prefSaved && (
          <p className="text-xs text-success flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {t("email_pref_saved")}
          </p>
        )}
      </AppPanel>

      {/* Privacy notice */}
      <AppPanel className="flex items-center gap-3" padded>
        <div className="rounded-sm border border-border/70 bg-muted/30 p-2 text-brand-ink">
          <Shield className="h-5 w-5" />
        </div>
        <p className="text-xs text-muted-foreground">{t("privacy_notice")}</p>
      </AppPanel>
    </div>
  );
}
