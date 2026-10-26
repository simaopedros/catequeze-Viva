import { useTranslation } from "react-i18next";
import { AuthPageLayout } from "../AuthPageLayout";
import CustomForgotPasswordForm from "./CustomForgotPasswordForm";

export function RequestPasswordResetPage() {
  const { t } = useTranslation("auth");
  return (
    <AuthPageLayout
      panel={{
        eyebrow: t("forgot_panel_eyebrow"),
        title: t("forgot_panel_title"),
        subtitle: t("forgot_panel_subtitle"),
      }}
    >
      <CustomForgotPasswordForm />
    </AuthPageLayout>
  );
}
