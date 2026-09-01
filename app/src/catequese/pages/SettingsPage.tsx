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
} from "wasp/client/operations";
import PhoneMaskInput from "../../client/components/PhoneMaskInput";
import TwoFactorSetup from "../components/TwoFactorSetup";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "../../client/validation/schemas";
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

  // Profile form (manual since it uses PhoneMaskInput which doesn't support ref)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhone(user?.phone || "");
  }, [user]);

  // Password form with Zod
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      await updateUserProfile({ firstName, lastName, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || t("save_profile_error"));
    }
    setSaving(false);
  };

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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="text-xs font-medium">
              {t("first_name")}
            </label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("first_name_placeholder")}
              className="h-10 rounded-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className="text-xs font-medium">
              {t("last_name")}
            </label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("last_name_placeholder")}
              className="h-10 rounded-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-medium">
            {t("phone")}
          </label>
          <PhoneMaskInput
            value={phone}
            onChange={setPhone}
            className="flex h-10 w-full rounded-sm"
            placeholder={t("phone_placeholder")}
          />
        </div>
        {saveError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {saveError}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-md"
            onClick={handleSaveProfile}
            disabled={saving}
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
      </AppPanel>

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
