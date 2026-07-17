import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  CheckCircle,
  Clock,
  Upload,
  Trash2,
  XCircle,
  AlertTriangle,
  FileUp,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Progress } from "../../client/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../client/components/ui/tooltip";
import { Avatar, AvatarFallback } from "../../client/components/ui/avatar";
import {
  AppPageHeader,
  AppMetric,
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonTable } from "../../client/components/Skeletons";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  useQuery,
  listDocuments,
  listCatechumens,
  getDashboardStats,
  verifyDocument,
  rejectDocument,
  deleteDocument,
} from "wasp/client/operations";
import { uploadDocumentMultipart } from "../../client/utils/documentUpload";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { useDocumentTypeLabels } from "../../i18n/useLabels";

const DOC_TYPE_KEYS = [
  "BAPTISM_CERTIFICATE",
  "BIRTH_CERTIFICATE",
  "CONSENT_FORM",
  "MARRIAGE_CERTIFICATE",
  "PASTORAL_LETTER",
  "OTHER",
] as const;

const COORDINATOR_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
];

type PersonRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

export default function DocumentsPage() {
  const { t: tc } = useTranslation("common");
  const docTypes = useDocumentTypeLabels(true);
  const { userRole } = useUserContext();
  const isCoordinator = COORDINATOR_ROLES.includes(userRole);
  const isGuardian = userRole === "GUARDIAN";
  const isCatechumen = userRole === "CATECHUMEN";
  const isFamily = isGuardian || isCatechumen;
  const canUpload =
    isCoordinator ||
    [
      "LEAD_CATECHIST",
      "ASSISTANT_CATECHIST",
      "GUARDIAN",
      "CATECHUMEN",
    ].includes(userRole);

  const { data: docs = [], isLoading: loadingDocs } = useQuery(listDocuments);
  const { data: stats, isLoading: loadingStats } = useQuery(
    getDashboardStats,
    {},
    { enabled: isGuardian },
  );
  const { data: staffCatechumens = [], isLoading: loadingStaff } = useQuery(
    listCatechumens,
    { take: 200 },
    { enabled: !isFamily },
  );
  const { data: selfProfiles = [], isLoading: loadingSelf } = useQuery(
    listCatechumens,
    { take: 5 },
    { enabled: isCatechumen },
  );

  const catechumens: PersonRow[] = useMemo(() => {
    if (isGuardian) {
      return ((stats as any)?.dependents ?? []).map((d: any) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
      }));
    }
    if (isCatechumen) {
      return (selfProfiles as PersonRow[]).map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
      }));
    }
    return (staffCatechumens as PersonRow[]).map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
    }));
  }, [isGuardian, isCatechumen, stats, selfProfiles, staffCatechumens]);

  const loading =
    loadingDocs ||
    (isGuardian && loadingStats) ||
    (isCatechumen && loadingSelf) ||
    (!isFamily && loadingStaff);

  const [uploadDialog, setUploadDialog] = useState<{
    catechumenId: string;
    docType: string;
  } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const docMap = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    for (const d of docs) {
      if (!d.catechumenProfileId) continue;
      if (!map[d.catechumenProfileId]) map[d.catechumenProfileId] = {};
      map[d.catechumenProfileId][d.type] = d;
    }
    return map;
  }, [docs]);

  const totalSlots = catechumens.length * DOC_TYPE_KEYS.length;
  const metrics = useMemo(() => {
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    for (const d of docs) {
      if (d.status === "VERIFIED") verified++;
      else if (d.status === "PENDING") pending++;
      else if (d.status === "REJECTED") rejected++;
    }
    const missing = Math.max(0, totalSlots - (verified + pending + rejected));
    return { verified, pending, rejected, missing };
  }, [docs, totalSlots]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
  };

  const handleUpload = async () => {
    if (!uploadDialog || !selectedFile) return;
    try {
      await uploadDocumentMultipart({
        file: selectedFile,
        name:
          fileName || docTypes[uploadDialog.docType as keyof typeof docTypes],
        type: uploadDialog.docType,
        catechumenProfileId: uploadDialog.catechumenId,
      });
      toast({ title: tc("documents.sent_success") });
      closeUploadDialog();
    } catch (e: any) {
      toast({
        title: tc("error"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const closeUploadDialog = () => {
    setUploadDialog(null);
    setSelectedFile(null);
    setFileName("");
  };

  const handleVerify = async (id: string) => {
    try {
      await verifyDocument({ id });
      toast({ title: tc("documents.verified_success") });
    } catch (e: any) {
      toast({
        title: tc("error"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      await rejectDocument({ id: rejectingId });
      toast({ title: tc("documents.rejected_success") });
      setRejectingId(null);
    } catch (e: any) {
      toast({
        title: tc("error"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument({ id });
      toast({ title: tc("documents.removed_success") });
    } catch (e: any) {
      toast({
        title: tc("error"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  const uploadingCatechumen = uploadDialog
    ? catechumens.find((c) => c.id === uploadDialog.catechumenId)
    : null;

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={tc("documents.title")}
        title={tc("documents.title")}
        subtitle={
          isFamily
            ? tc("documents.family_page_subtitle")
            : tc("documents.page_subtitle")
        }
        primaryAction={
          canUpload && catechumens.length > 0
            ? {
                label: tc("upload"),
                onClick: () => {
                  const first = catechumens[0];
                  if (first) {
                    setUploadDialog({
                      catechumenId: first.id,
                      docType: DOC_TYPE_KEYS[0],
                    });
                  }
                },
              }
            : undefined
        }
      />

      {catechumens.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AppMetric
            label={tc("documents.verified")}
            value={metrics.verified}
          />
          <AppMetric label={tc("documents.pending")} value={metrics.pending} />
          <AppMetric
            label={tc("documents.status_rejected")}
            value={metrics.rejected}
          />
          <AppMetric
            label={tc("documents.status_missing")}
            value={metrics.missing}
          />
        </div>
      )}

      <Dialog
        open={uploadDialog !== null}
        onOpenChange={(open) => {
          if (!open) closeUploadDialog();
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{tc("documents.upload_dialog_title")}</DialogTitle>
            <DialogDescription>
              {uploadingCatechumen &&
                tc("documents.upload_dialog_desc", {
                  name: `${uploadingCatechumen.firstName || ""} ${
                    uploadingCatechumen.lastName || ""
                  }`.trim(),
                  type:
                    docTypes[uploadDialog?.docType as keyof typeof docTypes] ??
                    uploadDialog?.docType,
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 rounded-sm border border-dashed border-border/70 p-6 transition-colors hover:bg-muted/20">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <span
                  className="text-sm font-semibold tracking-tight text-brand-ink"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
                  {tc("documents.select_file")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fileName || tc("documents.no_file_selected")}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {fileName && (
              <p className="text-sm text-muted-foreground truncate">
                {fileName}
              </p>
            )}
          </div>
          <DialogFooter className="sticky bottom-0 gap-2 bg-surface-elevated sm:static">
            <Button variant="outline" onClick={closeUploadDialog}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile}>
              <Upload className="mr-1.5 h-4 w-4" />
              {tc("upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={rejectingId !== null}
        onOpenChange={(open) => {
          if (!open) setRejectingId(null);
        }}
        title={tc("documents.reject_title")}
        description={tc("documents.reject_confirm")}
        confirmLabel={tc("documents.reject_btn")}
        variant="destructive"
        onConfirm={handleReject}
      />

      {catechumens.length > 0 && (
        <div className="space-y-4">
          {catechumens.map((c) => {
            const catechumenDocs = docMap[c.id] || {};
            const docValues = Object.values(catechumenDocs);
            const pendingCount = docValues.filter(
              (d: any) => d.status === "PENDING",
            ).length;
            const rejectedCount = docValues.filter(
              (d: any) => d.status === "REJECTED",
            ).length;
            const verifiedCount = docValues.filter(
              (d: any) => d.status === "VERIFIED",
            ).length;
            const progressPct = Math.round(
              (verifiedCount / DOC_TYPE_KEYS.length) * 100,
            );
            const initials = `${c.firstName?.[0] || ""}${
              c.lastName?.[0] || ""
            }`.toUpperCase();

            return (
              <div
                key={c.id}
                className="rounded-sm border border-border/70 bg-surface-elevated p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="rounded-sm border border-border/70 bg-muted/30 text-xs font-semibold text-brand-ink">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate text-sm font-semibold tracking-tight text-brand-ink"
                      style={{ fontFamily: "var(--font-brand-display)" }}
                    >
                      {c.firstName} {c.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Progress
                        value={progressPct}
                        className="h-1.5 flex-1 max-w-[120px]"
                      />
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {tc("documents.verified_of", {
                          verified: verifiedCount,
                          total: DOC_TYPE_KEYS.length,
                        })}
                      </span>
                    </div>
                  </div>
                  {pendingCount > 0 && (
                    <Badge variant="warning" size="sm">
                      {tc("documents.alert_pending", { count: pendingCount })}
                    </Badge>
                  )}
                  {rejectedCount > 0 && (
                    <Badge variant="destructive" size="sm">
                      {tc("documents.alert_rejected", { count: rejectedCount })}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {DOC_TYPE_KEYS.map((type) => {
                    const label = docTypes[type];
                    const doc = catechumenDocs[type];
                    const status:
                      | "VERIFIED"
                      | "PENDING"
                      | "REJECTED"
                      | "MISSING" = doc?.status || "MISSING";

                    const statusVisual = {
                      VERIFIED: {
                        Icon: CheckCircle,
                        color: "text-success",
                        badge: "success" as const,
                      },
                      PENDING: {
                        Icon: Clock,
                        color: "text-warning",
                        badge: "warning" as const,
                      },
                      REJECTED: {
                        Icon: XCircle,
                        color: "text-destructive",
                        badge: "destructive" as const,
                      },
                      MISSING: {
                        Icon: AlertTriangle,
                        color: "text-muted-foreground",
                        badge: "secondary" as const,
                      },
                    }[status];

                    const StatusIcon = statusVisual.Icon;

                    return (
                      <div
                        key={type}
                        className={`flex h-[44px] items-center justify-between rounded-sm border border-border/70 p-2.5 ${
                          status === "MISSING"
                            ? "border-dashed bg-muted/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusIcon
                            className={`h-4 w-4 flex-shrink-0 ${statusVisual.color}`}
                          />
                          <span
                            className="truncate text-xs font-semibold tracking-tight text-brand-ink"
                            style={{ fontFamily: "var(--font-brand-display)" }}
                          >
                            {label}
                          </span>
                          {status !== "MISSING" && (
                            <Badge
                              variant={statusVisual.badge}
                              size="sm"
                              className="flex-shrink-0"
                            >
                              {tc(
                                `documents.status_${status.toLowerCase()}` as any,
                              )}
                            </Badge>
                          )}
                          {status === "MISSING" && (
                            <span className="text-[10px] text-muted-foreground italic flex-shrink-0">
                              {tc("documents.status_missing")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                          {status === "MISSING" && canUpload && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-11 w-11 min-h-11 min-w-11 sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
                                  onClick={() =>
                                    setUploadDialog({
                                      catechumenId: c.id,
                                      docType: type,
                                    })
                                  }
                                >
                                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {tc("documents.tooltip_upload")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {status === "PENDING" && isCoordinator && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => handleVerify(doc.id)}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {tc("documents.tooltip_approve")}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setRejectingId(doc.id)}
                                  >
                                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {tc("documents.tooltip_reject")}
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {status === "REJECTED" && isCoordinator && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleVerify(doc.id)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {tc("documents.tooltip_approve")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {(status === "VERIFIED" || status === "REJECTED") &&
                            canUpload && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-11 w-11 min-h-11 min-w-11 sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
                                    onClick={() =>
                                      setUploadDialog({
                                        catechumenId: c.id,
                                        docType: type,
                                      })
                                    }
                                  >
                                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {tc("documents.tooltip_replace")}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          {doc && canUpload && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-11 w-11 min-h-11 min-w-11 sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
                                  onClick={() => handleDelete(doc.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {tc("documents.tooltip_delete")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {catechumens.length === 0 && (
        <EmptyState
          icon={FileText}
          title={
            isFamily
              ? tc("documents.family_empty_title")
              : tc("documents.no_catechumen_found")
          }
          description={
            isFamily
              ? tc("documents.family_empty_hint")
              : tc("documents.empty_register_hint")
          }
        />
      )}
    </div>
  );
}
