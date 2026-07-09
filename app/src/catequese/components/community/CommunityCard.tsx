import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../client/components/ui/badge";
import {
  MapPin,
  Users,
  Phone,
  Mail,
  User,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { COMMUNITY_TYPE_LABELS } from "../../../shared/constants";

interface CommunityCardProps {
  community: any;
  onEdit: (c: any) => void;
  isEditing: boolean;
  editForm: React.ReactNode;
}

export function CommunityCard({
  community,
  onEdit,
  isEditing,
  editForm,
}: CommunityCardProps) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const c = community;

  if (isEditing) {
    return <div className="md:col-span-2">{editForm}</div>;
  }

  const address =
    [c.street, c.number, c.neighborhood, c.city, c.state]
      .filter(Boolean)
      .join(", ") || null;

  return (
    <div className="rounded-sm border border-border/70 bg-white hover:border-[#071A2D]/30 transition-colors">
      <div
        className="p-4 cursor-pointer flex items-start justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{c.name}</p>
            {c.type && (
              <Badge variant="outline" className="text-overline">
                {COMMUNITY_TYPE_LABELS[c.type] || c.type}
              </Badge>
            )}
          </div>
          {address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {address}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {c._count?.memberships || 0} membros
            </span>
            {c.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {c.phone}
              </span>
            )}
            {c.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {c.email}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(c);
            }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t("edit")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {c.parish && (
            <span className="hidden rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5 text-overline text-muted-foreground sm:inline-block">
              {c.parish.name}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t pt-3 space-y-2 text-sm animate-in fade-in slide-in-from-top-1">
          {c.description && (
            <p className="text-muted-foreground">{c.description}</p>
          )}
          <div className="grid gap-1 sm:grid-cols-2">
            {c.coordinatorName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>
                  Resp.: {c.coordinatorName}
                  {c.coordinatorPhone ? ` (${c.coordinatorPhone})` : ""}
                </span>
              </div>
            )}
            {c.street && (
              <div className="text-muted-foreground">
                {[c.street, c.number, c.neighborhood, c.complement]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
            {c.zipCode && (
              <div className="text-muted-foreground">CEP: {c.zipCode}</div>
            )}
            {c.city && (
              <div className="text-muted-foreground">
                {[c.city, c.state].filter(Boolean).join(" - ")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
