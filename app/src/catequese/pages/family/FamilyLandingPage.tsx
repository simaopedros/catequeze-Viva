import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Church } from "lucide-react";
import { staffPortalUrl } from "../../../shared/portal";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
  AppPanel,
} from "../../../client/components/brand/AppChrome";

export default function FamilyLandingPage() {
  const { t } = useTranslation("family");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-2.5">
          <AppEyebrow className="text-center">{t("portal_badge")}</AppEyebrow>
          <AppDisplayTitle className="text-center text-3xl sm:text-[2rem]">
            {t("app_name")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("landing.tagline")}
          </p>
        </div>

        <AppPanel className="space-y-6 p-8">
          <Church className="mx-auto h-12 w-12 text-[#071A2D]" />
          <div className="space-y-2">
            <h2
              className="text-xl font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {t("landing.invite_title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("landing.invite_desc")}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/entrar"
              className="block w-full rounded-sm bg-[#071A2D] text-white h-10 px-4 py-2 text-sm font-medium text-center hover:bg-[#0a2540] transition-colors"
            >
              {t("landing.enter")}
            </Link>
            <p className="text-xs text-muted-foreground">
              {t("landing.have_invite")}{" "}
              <Link
                to="/convite"
                className="text-[#071A2D] underline underline-offset-2"
              >
                {t("landing.insert_code")}
              </Link>
            </p>
          </div>
        </AppPanel>

        <p className="text-xs text-muted-foreground">
          {t("landing.staff_hint")}{" "}
          <a
            href={staffPortalUrl("/")}
            className="font-medium text-[#071A2D] underline underline-offset-2"
          >
            {t("landing.main_portal")}
          </a>
        </p>
      </div>
    </div>
  );
}
