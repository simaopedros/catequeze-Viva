import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import { updateParish } from "wasp/client/operations";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import {
  canEditOrganizationName,
  isOrganizationNameValid,
  organizationNameDismissKey,
  shouldShowOrganizationNameNotice,
} from "../../shared/organizationName";

export function OrganizationNameNotice() {
  const { workspace } = useActiveWorkspace();
  const { data: user } = useAuth();
  if (!workspace || !user) return null;
  return (
    <OrganizationNameNoticeForm
      key={`${user.id}:${workspace.id}`}
      workspace={workspace}
      userId={user.id}
      isAdmin={user.isAdmin}
    />
  );
}

function OrganizationNameNoticeForm({
  workspace,
  userId,
  isAdmin,
}: {
  workspace: {
    id: string;
    name: string;
    type: string;
    role: string;
    membershipStatus?: string;
  };
  userId: string;
  isAdmin: boolean;
}) {
  const { t } = useTranslation("onboarding");
  const key = organizationNameDismissKey(userId, workspace.id);
  const [dismissedAt, setDismissedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  if (
    saved ||
    !shouldShowOrganizationNameNotice({
      ...workspace,
      canEdit:
        canEditOrganizationName(workspace.role, isAdmin) &&
        workspace.membershipStatus !== "INVITED",
      dismissedAt,
      now: Date.now(),
    })
  )
    return null;

  return (
    <form
      className="m-4 space-y-3 rounded-sm border border-border bg-background p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        if (!isOrganizationNameValid(workspace.type, name)) {
          setError(t("organization_name.required"));
          return;
        }
        setSaving(true);
        setError("");
        try {
          await updateParish({ id: workspace.id, name: name.trim() });
          setSaved(true);
        } catch {
          setError(t("organization_name.save_error"));
        } finally {
          setSaving(false);
        }
      }}
    >
      <label
        htmlFor="missing-organization-name"
        className="block font-semibold"
      >
        {t(
          workspace.type === "DIOCESE"
            ? "organization_name.diocese_title"
            : "organization_name.parish_title",
        )}
      </label>
      <Input
        id="missing-organization-name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-describedby={error ? "organization-name-error" : undefined}
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p
          id="organization-name-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={saving || !isOrganizationNameValid(workspace.type, name)}
        >
          {t("organization_name.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => {
            const timestamp = String(Date.now());
            setDismissedAt(timestamp);
            try {
              localStorage.setItem(key, timestamp);
            } catch {
              /* Dismiss for this visit if storage is unavailable. */
            }
          }}
        >
          {t("organization_name.later")}
        </Button>
      </div>
    </form>
  );
}
