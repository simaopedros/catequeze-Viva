import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { cancelEnrollment, enrollCatechumen } from "wasp/client/operations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";
import { Label } from "../../client/components/ui/label";
import { toast } from "../../client/hooks/use-toast";
import { useEnrollableClasses } from "../../client/hooks/useEnrollableClasses";

export function EnrollInClassDialog({
  open,
  onOpenChange,
  catechumenId,
  catechumenName,
  enrolledClassIds,
  onEnrolled,
  mode = "enroll",
  fromEnrollmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catechumenId: string;
  catechumenName: string;
  enrolledClassIds: string[];
  onEnrolled: () => void;
  /** enroll = new class; transfer = leave current then enroll in another */
  mode?: "enroll" | "transfer";
  fromEnrollmentId?: string | null;
}) {
  const { t } = useTranslation("common");
  const isTransfer = mode === "transfer";
  const { classes, isLoading } = useEnrollableClasses(open);
  const available = classes.filter((c) => !enrolledClassIds.includes(c.id));
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setClassId("");
  }, [open]);

  const submit = async () => {
    if (!classId) return;
    if (isTransfer && !fromEnrollmentId) return;
    setSaving(true);
    try {
      if (isTransfer && fromEnrollmentId) {
        await cancelEnrollment({ enrollmentId: fromEnrollmentId });
      }
      await enrollCatechumen({ classId, catechumenProfileId: catechumenId });
      toast({
        title: isTransfer
          ? t("catechumens.transfer.success")
          : t("catechumens.enroll.success"),
      });
      onEnrolled();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: isTransfer
          ? t("catechumens.transfer.error")
          : t("catechumens.enroll.error"),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {isTransfer
              ? t("catechumens.transfer.title")
              : t("catechumens.enroll.title")}
          </DialogTitle>
          <DialogDescription>
            {isTransfer
              ? t("catechumens.transfer.desc", { name: catechumenName })
              : t("catechumens.enroll.desc", { name: catechumenName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="enroll-class">
            {isTransfer
              ? t("catechumens.transfer.label")
              : t("catechumens.enroll.label")}
          </Label>
          {isLoading ? (
            <div className="flex h-11 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isTransfer
                ? t("catechumens.transfer.no_classes")
                : t("catechumens.enroll.no_classes")}
            </p>
          ) : (
            <select
              id="enroll-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="flex h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="">
                {isTransfer
                  ? t("catechumens.transfer.placeholder")
                  : t("catechumens.enroll.placeholder")}
              </option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={!classId || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTransfer
              ? t("catechumens.transfer.submit")
              : t("catechumens.enroll.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
