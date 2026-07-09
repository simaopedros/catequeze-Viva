import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Mail } from "lucide-react";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
  AppPanel,
} from "../../../client/components/brand/AppChrome";

export default function FamilyInviteCodePage() {
  const { t } = useTranslation("family");
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate(`/convite/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2.5 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
            <Mail className="h-6 w-6 text-[#071A2D]" />
          </div>
          <AppEyebrow className="text-center">{t("portal_badge")}</AppEyebrow>
          <AppDisplayTitle className="text-center">
            {t("landing.insert_code")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("signup.requires_invite")}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <AppPanel className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">{t("landing.insert_code")}</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="abc123..."
              autoFocus
              required
            />
          </div>
          <Button
            type="submit"
            className="h-10 w-full rounded-sm"
            disabled={!code.trim()}
          >
            {t("invite.accept")}
          </Button>
          </AppPanel>
        </form>
      </div>
    </div>
  );
}
