import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { toast } from "../../client/hooks/use-toast";
import { formatDateOnly } from "../../i18n/format";
import { todayInAppTimezone } from "../../shared/calendarDate";
import {
  CERTIFICATE_KINDS,
  buildCertificateHtml,
  type CertificateKind,
} from "../../shared/certificates";

type Enrollment = {
  id: string;
  class?: { id: string; name: string; stage?: { name?: string } | null };
};

export function CertificateDialog({
  open,
  onOpenChange,
  locale,
  catechumenName,
  birthDate,
  parishName,
  enrollments,
  attendancePct,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  catechumenName: string;
  birthDate?: string | Date | null;
  parishName: string;
  enrollments: Enrollment[];
  attendancePct: number | null;
}) {
  const { t } = useTranslation("common");
  const [kind, setKind] = useState<CertificateKind>("enrollment");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [parish, setParish] = useState(parishName);
  const [place, setPlace] = useState("");
  const [catechist, setCatechist] = useState("");
  const [coordinator, setCoordinator] = useState("");
  const [issuedOn, setIssuedOn] = useState(todayInAppTimezone());

  useEffect(() => {
    if (!open) return;
    setEnrollmentId(enrollments[0]?.id ?? "");
    setParish(parishName);
    setIssuedOn(todayInAppTimezone());
  }, [open, enrollments, parishName]);

  const enrollment = useMemo(
    () => enrollments.find((e) => e.id === enrollmentId) ?? enrollments[0],
    [enrollments, enrollmentId],
  );

  const needsAttendance = kind === "attendance";
  const canGenerate =
    Boolean(enrollment?.class) &&
    parish.trim().length > 0 &&
    (!needsAttendance || attendancePct !== null);

  const generate = () => {
    if (!enrollment?.class) return;
    const className = enrollment.class.name;
    const stage = enrollment.class.stage?.name || className;
    const birth = birthDate
      ? t("catechumens.certificate.birth_clause", {
          date: formatDateOnly(birthDate, locale),
        })
      : "";
    const values = {
      name: catechumenName,
      birth,
      parish: parish.trim(),
      className,
      stage,
      pct: attendancePct ?? 0,
      interpolation: { escapeValue: false },
    };
    const html = buildCertificateHtml({
      lang: locale,
      heading: parish.trim(),
      title: t(`catechumens.certificate.kinds.${kind}.title`),
      paragraphs: [t(`catechumens.certificate.kinds.${kind}.body`, values)],
      placeAndDate: t("catechumens.certificate.place_date", {
        place: place.trim() || parish.trim(),
        date: formatDateOnly(issuedOn, locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        interpolation: { escapeValue: false },
      }),
      signatures: [
        {
          name: catechist.trim(),
          role: t("catechumens.certificate.signer_catechist"),
        },
        {
          name: coordinator.trim(),
          role: t("catechumens.certificate.signer_coordinator"),
        },
      ],
    });
    const win = window.open("", "_blank");
    if (!win) {
      toast({
        title: t("catechumens.certificate.popup_blocked"),
        variant: "destructive",
      });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("catechumens.certificate.dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("catechumens.certificate.dialog_desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cert-kind">
              {t("catechumens.certificate.kind_label")}
            </Label>
            <select
              id="cert-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as CertificateKind)}
              className="flex h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              {CERTIFICATE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`catechumens.certificate.kinds.${k}.title`)}
                </option>
              ))}
            </select>
            {needsAttendance && attendancePct === null && (
              <p className="text-xs text-destructive">
                {t("catechumens.certificate.no_attendance")}
              </p>
            )}
          </div>

          {enrollments.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="cert-class">
                {t("catechumens.certificate.class_label")}
              </Label>
              <select
                id="cert-class"
                value={enrollment?.id ?? ""}
                onChange={(e) => setEnrollmentId(e.target.value)}
                className="flex h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
              >
                {enrollments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.class?.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cert-parish">
                {t("catechumens.certificate.parish_label")}
              </Label>
              <Input
                id="cert-parish"
                value={parish}
                onChange={(e) => setParish(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-place">
                {t("catechumens.certificate.place_label")}
              </Label>
              <Input
                id="cert-place"
                value={place}
                placeholder={t("catechumens.certificate.place_placeholder")}
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-date">
                {t("catechumens.certificate.date_label")}
              </Label>
              <Input
                id="cert-date"
                type="date"
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-catechist">
                {t("catechumens.certificate.signer_catechist")}
              </Label>
              <Input
                id="cert-catechist"
                value={catechist}
                onChange={(e) => setCatechist(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-coordinator">
                {t("catechumens.certificate.signer_coordinator")}
              </Label>
              <Input
                id="cert-coordinator"
                value={coordinator}
                onChange={(e) => setCoordinator(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={generate} disabled={!canGenerate}>
            <Printer className="mr-2 h-4 w-4" />
            {t("catechumens.certificate.generate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
