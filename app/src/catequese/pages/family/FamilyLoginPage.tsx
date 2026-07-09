import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import CustomLoginForm from "../../../auth/CustomLoginForm";
import { useRedirectIfLoggedIn } from "../../../auth/hooks/useRedirectIfLoggedIn";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
  AppPanel,
} from "../../../client/components/brand/AppChrome";

export default function FamilyLoginPage() {
  const { t } = useTranslation("family");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  useRedirectIfLoggedIn();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2.5 text-center">
          <AppEyebrow className="text-center">{t("portal_badge")}</AppEyebrow>
          <AppDisplayTitle className="text-center">
            {t("login.title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <AppPanel className="p-6">
          <CustomLoginForm inviteToken={token} />
        </AppPanel>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("login.no_account")}{" "}
            <Link
              to={`/criar-conta${token ? `?token=${token}` : ""}`}
              className="text-[#071A2D] underline underline-offset-2 font-medium"
            >
              {t("login.create_account")}
            </Link>
          </p>
          {token && (
            <p className="text-xs text-muted-foreground">
              {t("login.token_hint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
