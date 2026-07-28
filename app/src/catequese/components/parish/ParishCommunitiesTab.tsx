import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { Plus, MapPin, Pencil, Check, X, Building2 } from "lucide-react";
import { useCommunityTypeLabels } from "../../../i18n/useLabels";

interface ParishCommunitiesTabProps {
  communities: any[];
  onCreate: (name: string, type: string, location: string) => Promise<void>;
  onUpdate: (id: string, fields: any) => Promise<void>;
}

export function ParishCommunitiesTab({
  communities,
  onCreate,
  onUpdate,
}: ParishCommunitiesTabProps) {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const typeLabels = useCommunityTypeLabels();
  const [newCommName, setNewCommName] = useState("");
  const [newCommLoc, setNewCommLoc] = useState("");
  const [newCommType, setNewCommType] = useState("");
  const [creatingComm, setCreatingComm] = useState(false);
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [editCommFields, setEditCommFields] = useState<any>({});
  const [savingComm, setSavingComm] = useState(false);

  const typeShortLabel = (type: string) => {
    if (type === "CHAPEL") return typeLabels.CHAPEL;
    if (type === "URBAN_COMMUNITY") return tp("type_short_urbana");
    if (type === "RURAL_COMMUNITY") return tp("type_short_rural_label");
    if (type === "MISSION") return typeLabels.MISSION;
    return type;
  };

  const handleCreate = async () => {
    if (!newCommName.trim()) return;
    setCreatingComm(true);
    try {
      await onCreate(newCommName.trim(), newCommType, newCommLoc);
      setNewCommName("");
      setNewCommLoc("");
      setNewCommType("");
    } finally {
      setCreatingComm(false);
    }
  };

  const startEdit = (c: any) => {
    setEditCommFields({
      name: c.name || "",
      type: c.type || "",
      location: c.location || "",
      phone: c.phone || "",
      email: c.email || "",
      coordinatorName: c.coordinatorName || "",
    });
    setEditingCommId(c.id);
  };

  const cancelEdit = () => {
    setEditingCommId(null);
    setEditCommFields({});
  };

  const handleUpdate = async () => {
    if (!editingCommId || !editCommFields.name?.trim()) return;
    setSavingComm(true);
    try {
      await onUpdate(editingCommId, editCommFields);
      cancelEdit();
    } finally {
      setSavingComm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border/70 bg-white p-4 space-y-3">
        <div className="flex gap-3">
          <input
            placeholder={`${tp("community_name")} *`}
            value={newCommName}
            onChange={(e) => setNewCommName(e.target.value)}
            className="flex h-9 flex-1 rounded-sm border border-input bg-background px-3 py-1 text-sm"
          />
          <select
            value={newCommType}
            onChange={(e) => setNewCommType(e.target.value)}
            className="h-9 w-40 rounded-sm border border-input bg-background px-3 text-sm"
          >
            <option value="">{tp("type")}</option>
            <option value="CHAPEL">{typeLabels.CHAPEL}</option>
            <option value="URBAN_COMMUNITY">{tp("type_short_urban")}</option>
            <option value="RURAL_COMMUNITY">{tp("type_short_rural")}</option>
            <option value="MISSION">{typeLabels.MISSION}</option>
          </select>
          <input
            placeholder={tp("location_address")}
            aria-label={tp("location_address")}
            value={newCommLoc}
            onChange={(e) => setNewCommLoc(e.target.value)}
            className="flex h-9 flex-1 rounded-sm border border-input bg-background px-3 py-1 text-sm"
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creatingComm || !newCommName.trim()}
          >
            <Plus className="mr-1 h-3 w-3" />
            {tp("create")}
          </Button>
        </div>
      </div>

      {communities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white px-6 py-12 text-center">
          <div className="mb-3 rounded-sm border border-border/70 bg-muted/30 p-3">
            <Building2 className="h-8 w-8 text-[#071A2D]" />
          </div>
          <p
            className="text-sm font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {tp("no_communities")}
          </p>
          <div className="mx-auto mt-2 h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {communities.map((c: any) => {
            if (editingCommId === c.id) {
              return (
                <div
                  key={c.id}
                  className="rounded-sm border border-border/70 bg-white p-4 space-y-2 md:col-span-2"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {tp("edit_community")}
                    </h3>
                    <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={editCommFields.name}
                      onChange={(e) =>
                        setEditCommFields((p: any) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm"
                      placeholder={`${tp("name")} *`}
                      autoFocus
                    />
                    <select
                      value={editCommFields.type}
                      onChange={(e) =>
                        setEditCommFields((p: any) => ({
                          ...p,
                          type: e.target.value,
                        }))
                      }
                      className="h-9 w-36 rounded-sm border border-input bg-background px-3 text-sm"
                    >
                      <option value="">{tp("type")}</option>
                      <option value="CHAPEL">{typeLabels.CHAPEL}</option>
                      <option value="URBAN_COMMUNITY">
                        {tp("type_short_urbana")}
                      </option>
                      <option value="RURAL_COMMUNITY">
                        {tp("type_short_rural_label")}
                      </option>
                      <option value="MISSION">{typeLabels.MISSION}</option>
                    </select>
                    <input
                      value={editCommFields.location}
                      onChange={(e) =>
                        setEditCommFields((p: any) => ({
                          ...p,
                          location: e.target.value,
                        }))
                      }
                      className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm"
                      placeholder={tp("location")}
                      aria-label={tp("location")}
                    />
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={editCommFields.phone}
                      onChange={(e) =>
                        setEditCommFields((p: any) => ({
                          ...p,
                          phone: e.target.value,
                        }))
                      }
                      className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm"
                      placeholder={t("phone")}
                      aria-label={t("phone")}
                    />
                    <input
                      value={editCommFields.email}
                      onChange={(e) =>
                        setEditCommFields((p: any) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                      className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm"
                      placeholder={tp("email")}
                      aria-label={tp("email")}
                    />
                    <input
                      value={editCommFields.coordinatorName}
                      onChange={(e) =>
                        setEditCommFields((p: any) => ({
                          ...p,
                          coordinatorName: e.target.value,
                        }))
                      }
                      className="flex-1 h-9 rounded-sm border border-input bg-background px-3 text-sm"
                      placeholder={tp("responsible")}
                      aria-label={tp("responsible")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={savingComm || !editCommFields.name?.trim()}
                    >
                      {savingComm ? (
                        "..."
                      ) : (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          {tp("save")}
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="mr-1 h-3 w-3" />
                      {tp("cancel")}
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={c.id}
                className="rounded-sm border border-border/70 bg-white p-4 hover:border-[#071A2D]/30 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className="font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {c.name}
                      </p>
                      {c.type && (
                        <span className="text-overline bg-muted px-1.5 py-0.5 rounded">
                          {typeShortLabel(c.type)}
                        </span>
                      )}
                    </div>
                    {c.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {c.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {tp("members_count_short", {
                        count: c._count?.memberships || 0,
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(c)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-[#071A2D] transition-colors"
                    title={tp("edit")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                {(c.coordinatorName || c.phone || c.email) && (
                  <div className="mt-2 pt-2 border-t flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {c.coordinatorName && (
                      <span>
                        {tp("responsible_abbr")} {c.coordinatorName}
                      </span>
                    )}
                    {c.phone && <span>{c.phone}</span>}
                    {c.email && <span>{c.email}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
