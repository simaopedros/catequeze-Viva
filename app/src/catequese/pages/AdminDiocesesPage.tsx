import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Plus, Church, Edit, Save, X } from "lucide-react";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import {
  useQuery,
  listDioceses,
  createDiocese,
  updateDiocese,
} from "wasp/client/operations";

export default function AdminDiocesesPage({ user }: { user: AuthUser }) {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const { data: dioceses = [], isLoading: loading } = useQuery(listDioceses);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("BR");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (!name) return;
    setSaving(true);
    try {
      await createDiocese({ name, country });
      setName("");
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || t("create_error"));
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName) return;
    try {
      await updateDiocese({ id, name: editName });
      setEditingId(null);
    } catch (e: any) {
      setError(e.message || t("update_error"));
    }
  };

  if (loading) {
    return (
      <DefaultLayout user={user}>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#071A2D]" />
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("title")}
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <Button
              size="sm"
              className="h-10 rounded-sm shadow-none"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("new_diocese")}
            </Button>
          }
        />

        {error && (
          <div className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {showForm && (
          <AppPanel className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("new_diocese")}
              </p>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="flex gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 flex-1"
                placeholder={t("name_placeholder")}
                aria-label={t("name_placeholder")}
              />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
              >
                {(["BR", "PT", "AO", "MZ"] as const).map((c) => (
                  <option key={c} value={c}>
                    {t(`countries.${c}`)}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={saving || !name}
              >
                <Save className="mr-1 h-3 w-3" />
                {saving ? t("creating") : t("create")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-sm"
                onClick={() => setShowForm(false)}
              >
                {tc("cancel")}
              </Button>
            </div>
          </AppPanel>
        )}

        <div className="rounded-sm border border-border/70 bg-white overflow-hidden">
          {dioceses.length === 0 ? (
            <EmptyState
              icon={Church}
              title={t("empty_title")}
              description={t("empty_desc")}
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("columns.name")}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("columns.country")}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("columns.parishes")}
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {dioceses.map((d: any) => (
                  <tr
                    key={d.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      {editingId === d.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm w-full"
                        />
                      ) : (
                        d.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t(`countries.${d.country}`, { defaultValue: d.country })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d._count?.parishes || 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === d.id ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleUpdate(d.id)}
                            className="p-1 text-success hover:bg-success/10 rounded"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-muted-foreground hover:bg-muted rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(d.id);
                            setEditName(d.name);
                          }}
                          className="p-1 text-muted-foreground hover:text-[#071A2D] rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}
