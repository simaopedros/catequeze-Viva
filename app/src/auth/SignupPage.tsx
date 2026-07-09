import { useTranslation } from "react-i18next";
import CustomSignupForm from "./CustomSignupForm";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function Signup() {
  useRedirectIfLoggedIn();
  const { t } = useTranslation("auth");

  const points = t("signup_panel_points", { returnObjects: true });
  const pointList = Array.isArray(points) ? (points as string[]) : [];

  return (
    <AuthPageLayout
      panel={{
        eyebrow: t("signup_panel_eyebrow"),
        title: t("signup_panel_title"),
        subtitle: t("signup_panel_subtitle"),
        points: pointList,
      }}
    >
      <CustomSignupForm />
    </AuthPageLayout>
  );
}
