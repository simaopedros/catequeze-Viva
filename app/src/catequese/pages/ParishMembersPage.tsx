import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  AppDisplayTitle,
  AppPageHeader,
} from "../../client/components/brand/AppChrome";
import { Badge } from "../../client/components/ui/badge";
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useRoleLabels, useMembershipStatusLabels } from "../../i18n/useLabels";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  useQuery,
  listParishMembers,
  listCommunities,
  listHouseholds,
  inviteUserToParish,
  removeMembership,
  updateMembershipRole,
} from "wasp/client/operations";
import { useUserContext } from "../../client/hooks/useUserContext";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

const INVITE_ROLE_KEYS = [
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "LEAD_CATECHIST",
  "ASSISTANT_CATECHIST",
  "GUARDIAN",
  "CATECHUMEN",
  "CONTENT_REVIEWER",
  "PASTORAL_VIEWER",
] as const;

const ASSIGNABLE_ROLES: Record<string, string[]> = {
  SUPER_ADMIN: [
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "GUARDIAN",
    "CATECHUMEN",
    "CONTENT_REVIEWER",
    "PASTORAL_VIEWER",
  ],
  DIOCESE_ADMIN: [
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "GUARDIAN",
    "CATECHUMEN",
    "CONTENT_REVIEWER",
    "PASTORAL_VIEWER",
  ],
  PARISH_COORDINATOR: [
    "COMMUNITY_COORDINATOR",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "GUARDIAN",
    "CATECHUMEN",
    "CONTENT_REVIEWER",
    "PASTORAL_VIEWER",
  ],
  COMMUNITY_COORDINATOR: [
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "GUARDIAN",
    "CATECHUMEN",
    "CONTENT_REVIEWER",
    "PASTORAL_VIEWER",
  ],
  LEAD_CATECHIST: ["GUARDIAN", "CATECHUMEN"],
  ASSISTANT_CATECHIST: ["GUARDIAN", "CATECHUMEN"],
  PERSONAL_OWNER: ["GUARDIAN", "CATECHUMEN"],
};

function getAssignableRolesForActor(
  actorRole: string,
  isAdmin: boolean,
): string[] {
  if (isAdmin) return ASSIGNABLE_ROLES.SUPER_ADMIN;
  return ASSIGNABLE_ROLES[actorRole] || [];
}

export default function ParishMembersPage() {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const { t: tn } = useTranslation("navigation");
  const roleLabels = useRoleLabels();
  const statusLabels = useMembershipStatusLabels();
  const { id: parishId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, userRole } = useUserContext();
  const assignable = getAssignableRolesForActor(userRole, isAdmin);
  const inviteRoles = useMemo(
    () =>
      INVITE_ROLE_KEYS.map((value) => ({ value, label: roleLabels[value] })),
    [roleLabels],
  );
  const allowedInviteRoles =
    assignable.length > 0 ? assignable : inviteRoles.map((r) => r.value);
  const canManageRoles =
    isAdmin ||
    [
      "SUPER_ADMIN",
      "DIOCESE_ADMIN",
      "PARISH_COORDINATOR",
      "COMMUNITY_COORDINATOR",
    ].includes(userRole);
  const { data: members = [], isLoading: loading } = useQuery(
    listParishMembers,
    { parishId: parishId! },
  );
  const { data: communities = [] } = useQuery(listCommunities, {
    parishId: parishId!,
  });
  const { data: households = [] } = useQuery(listHouseholds, {
    parishId: parishId!,
  } as any);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(
    allowedInviteRoles[0] || "GUARDIAN",
  );
  const [inviteCommunityId, setInviteCommunityId] = useState("");
  const [inviteHouseholdId, setInviteHouseholdId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteMsgIsError, setInviteMsgIsError] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg("");
    setInviteMsgIsError(false);
    try {
      await inviteUserToParish({
        email: inviteEmail,
        parishId: parishId || "",
        role: inviteRole,
        communityId: inviteCommunityId || undefined,
        householdId: inviteHouseholdId || undefined,
      });
      trackMarketingEvent("invite_sent", {
        role: inviteRole,
        placement: "parish_members_page",
        has_community: Boolean(inviteCommunityId),
        has_household: Boolean(inviteHouseholdId),
      });
      setInviteMsg(tp("invite_sent"));
      setInviteEmail("");
      setInviteCommunityId("");
      setInviteHouseholdId("");
      setShowInvite(false);
    } catch (e: any) {
      setInviteMsg(e.message || t("error_invite"));
      setInviteMsgIsError(true);
    }
    setInviting(false);
  };

  const handleRemove = async (membershipId: string) => {
    setRemoveTarget(membershipId);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <AppPageHeader
          eyebrow={tn("parishes")}
          title={tp("parish_members_title")}
          subtitle={tp("members_count_short", { count: members.length })}
          actions={
            <Button
              size="sm"
              className="h-10 rounded-sm shadow-none"
              onClick={() => setShowInvite(!showInvite)}
            >
              <UserPlus className="mr-1 h-4 w-4" />
              {tp("invite")}
            </Button>
          }
        />

        {error && (
          <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {showInvite && (
          <div className="space-y-3 rounded-sm border border-border/70 bg-white p-4">
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {tp("invite_member")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 min-w-[200px] h-9 rounded-sm border border-input bg-background px-3 text-sm"
                placeholder={t("families.email_placeholder")}
                type="email"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
              >
                {inviteRoles
                  .filter((r) => allowedInviteRoles.includes(r.value))
                  .map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
              </select>
              <select
                value={inviteCommunityId}
                onChange={(e) => setInviteCommunityId(e.target.value)}
                className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
              >
                <option value="">{tp("all_parish")}</option>
                {communities.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {(inviteRole === "GUARDIAN" || inviteRole === "CATECHUMEN") && (
                <select
                  value={inviteHouseholdId}
                  onChange={(e) => setInviteHouseholdId(e.target.value)}
                  className="h-9 rounded-sm border border-input bg-background px-3 text-sm min-w-[180px]"
                >
                  <option value="">{tp("no_family_later")}</option>
                  {households.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
              >
                <Mail className="mr-1 h-3 w-3" />
                {inviting ? "..." : tp("send")}
              </Button>
            </div>
            {inviteMsg && (
              <p
                className={
                  "text-xs " +
                  (inviteMsgIsError ? "text-destructive" : "text-[#071A2D]")
                }
              >
                {inviteMsg}
              </p>
            )}
          </div>
        )}

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
            <div className="mb-4 rounded-sm border border-border/70 bg-muted/30 p-3">
              <Users className="h-8 w-8 text-foreground" />
            </div>
            <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
              {tp("no_members")}
            </AppDisplayTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {tp("no_members_desc")}
            </p>
          </div>
        ) : (
          <div className="rounded-sm border border-border/70 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    {tp("name")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {tp("email")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {tp("communities")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {tp("role")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {tp("status")}
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    {tp("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => {
                  const status =
                    statusLabels[m.status as keyof typeof statusLabels] ||
                    statusLabels.INACTIVE;
                  return (
                    <tr
                      key={m.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        {m.user?.firstName ||
                          m.user?.email?.split("@")[0] ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.user?.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.community?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canManageRoles ? (
                          <select
                            value={m.role}
                            onChange={async (e) => {
                              try {
                                await updateMembershipRole({
                                  membershipId: m.id,
                                  role: e.target.value,
                                });
                              } catch (err: any) {
                                setError(err.message || tp("error_update"));
                              }
                            }}
                            className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
                          >
                            {Object.entries(roleLabels)
                              .filter(
                                ([key]) =>
                                  assignable.includes(key) || key === m.role,
                              )
                              .map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {roleLabels[m.role as keyof typeof roleLabels] ||
                              m.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium " +
                            status.color
                          }
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemove(m.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={tp("member_remove_title")}
        description={t("remove_confirm")}
        confirmLabel={t("remove")}
        variant="destructive"
        onConfirm={async () => {
          if (removeTarget) {
            try {
              await removeMembership({ membershipId: removeTarget });
            } catch (e: any) {
              setError(e.message || t("error_remove"));
            }
            setRemoveTarget(null);
          }
        }}
      />
    </>
  );
}
