import { useTranslation } from "react-i18next";
import { AuthPageLayout } from "../AuthPageLayout";
import CustomResetPasswordForm from "./CustomResetPasswordForm";

export function PasswordResetPage() {
  const { t } = useTranslation("auth");
  return (
    <AuthPageLayout
      pageTitle={t("reset_title")}
      panel={{
        eyebrow: t("reset_panel_eyebrow"),
        title: t("reset_panel_title"),
        subtitle: t("reset_panel_subtitle"),
      }}
    >
      <CustomResetPasswordForm />
    </AuthPageLayout>
  );
}
