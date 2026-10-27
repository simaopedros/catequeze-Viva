import { useParams, useNavigate } from "react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { ArrowLeft, Save, Camera, Plus } from "lucide-react";
import {
  useQuery,
  getCatechumenProfile,
  updateCatechumen,
  listHouseholds,
} from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";
import { useUnsavedChangesGuard } from "../../client/hooks/useUnsavedChangesGuard";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { Alert } from "../../client/components/ui/alert";
import CreateHouseholdModal from "../components/CreateHouseholdModal";
import { LocalizedDateInput } from "../../client/components/LocalizedDateInput";
import { isBirthDateAllowed } from "../../shared/personFields";

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 200;
        let w = img.width,
          h = img.height;
        if (w > h && w > MAX) {
          h *= MAX / w;
          w = MAX;
        } else if (h > MAX) {
          w *= MAX / h;
          h = MAX;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.5));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function EditCatechumenPage() {
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { activeParishId } = useActiveParish();
  const { data: households = [], refetch: refetchHouseholds } = useQuery(
    listHouseholds,
    { take: 200, parishId: activeParishId || undefined } as any,
    { enabled: Boolean(activeParishId) },
  );
  const filteredHouseholds = useMemo(() => {
    if (!activeParishId) return households;
    return households.filter((h: any) => h.parishId === activeParishId);
  }, [households, activeParishId]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [photo, setPhoto] = useState("");
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] =
    useState(false);
  const [baseline, setBaseline] = useState<{
    firstName: string;
    lastName: string;
    birthDate: string;
    email: string;
    householdId: string;
    photo: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const p = await getCatechumenProfile({ id: id! });
        if (p) {
          const next = {
            firstName: p.firstName || "",
            lastName: p.lastName || "",
            birthDate: p.birthDate
              ? new Date(p.birthDate).toISOString().slice(0, 10)
              : "",
            email: p.email || "",
            householdId: p.householdId || "",
            photo: p.photoUrl || "",
          };
          setFirstName(next.firstName);
          setLastName(next.lastName);
          setBirthDate(next.birthDate);
          setEmail(next.email);
          setHouseholdId(next.householdId);
          setPhoto(next.photo);
          setBaseline(next);
        }
      } catch (e: any) {
        setError(e.message || t("error_generic"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, t]);

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    return (
      firstName !== baseline.firstName ||
      lastName !== baseline.lastName ||
      birthDate !== baseline.birthDate ||
      email !== baseline.email ||
      householdId !== baseline.householdId ||
      photo !== baseline.photo
    );
  }, [baseline, firstName, lastName, birthDate, email, householdId, photo]);

  const leaveGuard = useUnsavedChangesGuard(isDirty && !saving);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPhoto(compressed);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!firstName || !lastName) return;
    if (birthDate && !isBirthDateAllowed(birthDate)) {
      setFieldError(t("validation.birth_date_future"));
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError(t("validation.email_invalid"));
      return;
    }
    setFieldError("");
    setSaving(true);
    setSaveFeedback(null);
    try {
      await updateCatechumen({
        id: id!,
        firstName,
        lastName,
        birthDate: birthDate || null,
        email: email.trim() || null,
        householdId: householdId || null,
        photoUrl: photo || undefined,
      });
      setBaseline({
        firstName,
        lastName,
        birthDate,
        email,
        householdId,
        photo,
      });
      const successMessage = t("catechumens.updated_success");
      setSaveFeedback({ tone: "success", message: successMessage });
      toast({ title: successMessage });
      // Let the toast mount before the route change; App-level Toaster keeps it.
      window.setTimeout(() => {
        navigate(`/app/catechumens/${id}`);
      }, 50);
    } catch (e: any) {
      const message =
        (typeof e?.data?.message === "string" && e.data.message) ||
        (typeof e?.message === "string" && e.message) ||
        t("error_generic");
      setSaveFeedback({ tone: "error", message });
      toast({
        title: t("error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () =>
    leaveGuard.confirmLeave(() => navigate(`/app/catechumens/${id}`));

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-sm" />
        </div>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}
      {!loading && !error && (
        <>
          <AppPageHeader
            eyebrow={t("catechumens.edit_title")}
            title={t("catechumens.edit_title")}
            actions={
              <Button
                variant="outline"
                size="sm"
                className="h-10 min-h-11 rounded-sm"
                type="button"
                onClick={goBack}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("back")}
              </Button>
            }
          />

          {/* <form> para Enter enviar — a tela era um div com botão onClick */}
          <form onSubmit={handleSave}>
            {fieldError && (
              <Alert variant="destructive" className="mb-4">
                {fieldError}
              </Alert>
            )}
            {saveFeedback && (
              <Alert
                variant={
                  saveFeedback.tone === "error" ? "destructive" : "default"
                }
                className="mb-4"
                role="status"
              >
                {saveFeedback.message}
              </Alert>
            )}
            <AppPanel className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative w-24 h-24 rounded-sm overflow-hidden bg-muted border border-dashed border-border/70 cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={t("catechumens.photo_alt")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Camera className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <span className="text-xs text-muted-foreground">
                  {t("catechumens.add_photo")}
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">
                      {t("first_name")}
                    </label>
                    <input
                      aria-label={t("first_name")}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">
                      {t("last_name")}
                    </label>
                    <input
                      aria-label={t("last_name")}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">
                    {t("catechumens.birth_short")}
                  </label>
                  <LocalizedDateInput
                    aria-label={t("catechumens.birth_short")}
                    value={birthDate}
                    onChange={setBirthDate}
                    className="mt-1 flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">{t("email")}</label>
                  <input
                    aria-label={t("email")}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email_placeholder")}
                    className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">
                    {t("catechumens.family")}
                  </label>
                  <select
                    aria-label={t("catechumens.family")}
                    value={householdId}
                    onChange={(e) => setHouseholdId(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("catechumens.no_family")}</option>
                    {filteredHouseholds.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setShowCreateHouseholdModal(true)}
                      className="inline-flex items-center gap-1 text-brand-ink underline"
                    >
                      <Plus className="h-3 w-3" />
                      {t("families.create_new_family")}
                    </button>
                  </p>
                </div>
                <div className="h-20 md:h-4" aria-hidden />
              </div>
            </AppPanel>

            <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-border/70 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:static md:inset-auto md:bottom-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
              <div className="mx-auto flex max-w-lg gap-3 md:pt-2">
                <Button
                  className="min-h-11 flex-1"
                  type="submit"
                  disabled={saving}
                >
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? t("saving") : t("save")}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  type="button"
                  onClick={goBack}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          </form>
        </>
      )}

      <CreateHouseholdModal
        isOpen={showCreateHouseholdModal}
        onClose={() => setShowCreateHouseholdModal(false)}
        onCreated={(newHouseholdId) => {
          setHouseholdId(newHouseholdId);
          void refetchHouseholds();
        }}
      />

      <ConfirmDialog
        open={leaveGuard.dialogOpen}
        onOpenChange={leaveGuard.setDialogOpen}
        title={t("leave_form_title")}
        description={t("leave_form_desc")}
        confirmLabel={t("leave_anyway")}
        variant="destructive"
        onConfirm={leaveGuard.onConfirmLeave}
      />
    </div>
  );
}
