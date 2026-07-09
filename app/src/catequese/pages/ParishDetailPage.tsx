import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  Church,
  MapPin,
  Users,
  Building2,
  Settings,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  useQuery,
  getParishById,
  listCommunities,
  listHouseholds,
  listParishMembers,
  updateParish,
  deleteParish,
  createCommunity,
  updateCommunity,
  inviteUserToParish,
  removeMembership,
} from "wasp/client/operations";
import { ParishInfoTab } from "../components/parish/ParishInfoTab";
import { ParishCommunitiesTab } from "../components/parish/ParishCommunitiesTab";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { ParishMembersTab } from "../components/parish/ParishMembersTab";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { toast } from "../../client/hooks/use-toast";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

type Tab = "info" | "communities" | "members";

export default function ParishDetailPage() {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const { t: tn } = useTranslation("navigation");
  const { id: parishId } = useParams<{ id: string }>();
  const pid = parishId ?? "";
  const navigate = useNavigate();

  const { data: parish, isLoading: loading } = useQuery(getParishById, {
    id: parishId!,
  });
  const { data: communities = [] } = useQuery(listCommunities, {
    parishId: parishId!,
  });
  const { data: members = [] } = useQuery(listParishMembers, {
    parishId: parishId!,
  });
  const { data: households = [] } = useQuery(listHouseholds, {
    parishId: parishId!,
  } as any);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("info");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [saving, setSaving] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const startEditing = () => {
    if (!parish) return;
    setEditName(parish.name || "");
    setEditCity(parish.city || "");
    setEditState(parish.state || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateParish({
        id: parishId!,
        name: editName,
        city: editCity || undefined,
        state: editState || undefined,
      });
      setEditing(false);
      toast({ title: tp("parish_updated") });
    } catch (e: any) {
      setError(e.message || tp("error_update"));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteParish({ id: pid, confirmation: "DELETAR" });
      toast({
        title: tp("parish_removed"),
        description: tp("parish_removed_desc"),
      });
      navigate("/app/parishes");
    } catch (e: any) {
      toast({
        title: tp("remove_parish_error"),
        description: e.message || t("try_again"),
        variant: "destructive",
      });
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleCreateCommunity = async (
    name: string,
    type: string,
    location: string,
  ) => {
    try {
      await createCommunity({
        name,
        parishId: parishId || "",
        type: type || undefined,
        location: location || undefined,
      });
      toast({ title: tp("community_created") });
    } catch (e: any) {
      toast({
        title: tp("community_create_error"),
        description: e.message || t("try_again"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateCommunity = async (id: string, fields: any) => {
    try {
      await updateCommunity({ id, ...fields });
      toast({ title: tp("community_updated") });
    } catch (e: any) {
      toast({
        title: tp("community_update_error"),
        description: e.message || t("try_again"),
        variant: "destructive",
      });
    }
  };

  const handleInvite = async (
    email: string,
    role: string,
    communityId: string,
    householdId: string,
  ): Promise<{ msg: string; isError: boolean }> => {
    try {
      await inviteUserToParish({
        email,
        parishId: pid,
        role,
        communityId: communityId || undefined,
        householdId: householdId || undefined,
      });
      trackMarketingEvent("invite_sent", {
        role,
        placement: "parish_detail_page",
        has_community: Boolean(communityId),
        has_household: Boolean(householdId),
      });
      toast({ title: tp("invite_sent") });
      return { msg: tp("invite_sent"), isError: false };
    } catch (e: any) {
      toast({
        title: tp("invite_send_error"),
        description: e.message || t("try_again"),
        variant: "destructive",
      });
      return { msg: e.message || tp("invite_send_error"), isError: true };
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      await removeMembership({ membershipId });
      toast({ title: tp("member_removed") });
    } catch (e: any) {
      toast({
        title: tp("member_remove_error"),
        description: e.message || t("try_again"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      </div>
    );
  }

  if (!parish && !loading) {
    return (
      <div className="flex flex-col items-center py-20 gap-2">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive">{error || tp("parish_not_found")}</p>
        <Button variant="ghost" onClick={() => navigate("/app/parishes")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {tp("back")}
        </Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "info", label: tp("tab_data"), icon: Settings },
    { id: "communities", label: tp("communities"), icon: Building2 },
    { id: "members", label: tp("members"), icon: Users },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => navigate("/app/parishes")}
            className="hover:text-[#071A2D] transition-colors"
          >
            {tn("parishes")}
          </button>
          <span>/</span>
          <span
            className="truncate font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {parish?.name}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-[#071A2D]">
            <Church className="h-5 w-5" />
          </div>
          <AppPageHeader
            className="min-w-0 flex-1 border-0 pb-0"
            eyebrow={tn("parishes")}
            title={parish?.name || ""}
            subtitle={
              parish?.city || parish?.state
                ? [parish.city, parish.state].filter(Boolean).join(", ")
                : undefined
            }
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-sm"
                onClick={() => navigate("/app/parishes")}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {tp("back")}
              </Button>
            }
          />
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex border-b gap-0">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors " +
                (tab === tabItem.id
                  ? "border-[#071A2D] text-[#071A2D]"
                  : "border-transparent text-muted-foreground hover:text-[#071A2D]")
              }
            >
              <tabItem.icon className="h-4 w-4" />
              {tabItem.label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <>
            <ParishInfoTab
              parish={parish}
              editing={editing}
              editName={editName}
              setEditName={setEditName}
              editCity={editCity}
              setEditCity={setEditCity}
              editState={editState}
              setEditState={setEditState}
              saving={saving}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              onStartEdit={startEditing}
            />

            {parish?.type !== "PERSONAL" && (
              <div className="space-y-3 rounded-sm border border-destructive/30 bg-destructive/5 p-5">
                <div className="space-y-1.5">
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {tp("danger_zone")}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tp("danger_zone_desc")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {tp("remove_parish")}
                </Button>
              </div>
            )}
          </>
        )}

        {tab === "communities" && (
          <ParishCommunitiesTab
            communities={communities}
            onCreate={handleCreateCommunity}
            onUpdate={handleUpdateCommunity}
          />
        )}

        {tab === "members" && (
          <ParishMembersTab
            members={members}
            communities={communities}
            households={households}
            onInvite={handleInvite}
            onRemove={handleRemoveMember}
          />
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={tp("remove_parish_title")}
        description={tp("remove_parish_desc", { name: parish?.name })}
        confirmLabel={t("remove")}
        variant="destructive"
        confirmPhrase="DELETAR"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
