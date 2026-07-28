import { useParams, useNavigate } from "react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { ArrowLeft, Save, Camera } from "lucide-react";
import { getCatechumenProfile, updateCatechumen } from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";
import { useUnsavedChangesGuard } from "../../client/hooks/useUnsavedChangesGuard";
import { Alert } from "../../client/components/ui/alert";

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photo, setPhoto] = useState("");
  const [baseline, setBaseline] = useState<{
    firstName: string;
    lastName: string;
    birthDate: string;
    photo: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            photo: p.photoUrl || "",
          };
          setFirstName(next.firstName);
          setLastName(next.lastName);
          setBirthDate(next.birthDate);
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
      photo !== baseline.photo
    );
  }, [baseline, firstName, lastName, birthDate, photo]);

  const leaveGuard = useUnsavedChangesGuard(isDirty && !saving);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPhoto(compressed);
  };

  const handleSave = async () => {
    if (!firstName || !lastName) return;
    setSaving(true);
    try {
      await updateCatechumen({
        id: id!,
        firstName,
        lastName,
        birthDate: birthDate || undefined,
        photoUrl: photo || undefined,
      });
      setBaseline({ firstName, lastName, birthDate, photo });
      toast({ title: t("catechumens.updated_success") });
      navigate(`/app/catechumens/${id}`);
    } catch (e: any) {
      toast({
        title: t("error"),
        description: e.message || t("error_generic"),
        variant: "destructive",
      });
    }
    setSaving(false);
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
                <input
                  aria-label={t("catechumens.birth_short")}
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-3 text-sm mt-1"
                />
              </div>
              <div className="h-20 md:h-4" aria-hidden />
            </div>
          </AppPanel>

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-border/70 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:static md:inset-auto md:bottom-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="mx-auto flex max-w-lg gap-3 md:pt-2">
              <Button
                className="min-h-11 flex-1"
                onClick={handleSave}
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
        </>
      )}

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
