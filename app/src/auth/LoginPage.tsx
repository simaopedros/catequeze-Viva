import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import CustomLoginForm from "./CustomLoginForm";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import { parseContinuationSearchParams } from "./portalContinuation";

export default function Login() {
  useRedirectIfLoggedIn();
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const continuationParams = useMemo(
    () => parseContinuationSearchParams(searchParams),
    [searchParams],
  );

  const points = t("login_panel_points", { returnObjects: true });
  const pointList = Array.isArray(points) ? (points as string[]) : [];

  return (
    <AuthPageLayout
      panel={{
        eyebrow: t("login_panel_eyebrow"),
        title: t("login_panel_title"),
        subtitle: t("login_panel_subtitle"),
        points: pointList,
      }}
    >
      <CustomLoginForm inviteToken={token} continuationParams={continuationParams} />
    </AuthPageLayout>
  );
}
