import { useTranslation } from "react-i18next";
import { Badge } from "../../client/components/ui/badge";
import {
  originLabelKey,
  type InheritancePolicy,
  type OriginAnnotation,
  type ResourceOwnerType,
} from "../../shared/resourceInheritance";

type OriginBadgeProps = {
  origin?: OriginAnnotation | null;
  ownerType?: ResourceOwnerType | string | null;
  inherited?: boolean;
  policy?: InheritancePolicy | string | null;
  className?: string;
};

function qualifierKey(args: {
  ownerType: ResourceOwnerType;
  inherited: boolean;
  policy?: InheritancePolicy | string | null;
}) {
  if (args.ownerType === "CLASS") return "origin.local";
  if (args.ownerType === "DIOCESE") return "origin.official";
  if (args.ownerType === "PARISH" && args.inherited) {
    return "origin.complementary";
  }
  if (args.inherited) return "origin.official";
  return "origin.local";
}

export function OriginBadge({
  origin,
  ownerType,
  inherited,
  policy,
  className,
}: OriginBadgeProps) {
  const { t } = useTranslation("hierarchy");
  const type = (origin?.ownerType || ownerType) as
    | ResourceOwnerType
    | undefined;
  if (!type || type === "PLATFORM") return null;
  const isInherited = origin?.inherited ?? Boolean(inherited);
  const resolvedPolicy = origin?.policy || policy;
  const variant =
    type === "DIOCESE" ? "info" : type === "PARISH" ? "brand" : "secondary";

  return (
    <Badge
      variant={variant}
      size="sm"
      className={className}
      data-testid="origin-badge"
    >
      {t(originLabelKey(type))}
      {" · "}
      {t(
        qualifierKey({
          ownerType: type,
          inherited: isInherited,
          policy: resolvedPolicy,
        }),
      )}
    </Badge>
  );
}
