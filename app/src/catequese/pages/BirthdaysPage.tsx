import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import { FilterPills } from "../../client/components/FilterPills";
import {
  useQuery,
  listUpcomingBirthdays,
  toggleBirthdayGift,
  listClasses,
} from "wasp/client/operations";
import { Gift, Download, Cake } from "lucide-react";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/useLocale";

export default function BirthdaysPage() {
  const { t } = useTranslation("birthdays");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();
  const [days, setDays] = useState("30");
  const [classFilter, setClassFilter] = useState("");
  const { data: classesData } = useQuery(listClasses);
  const { data: birthdays, isLoading } = useQuery(listUpcomingBirthdays, {
    classId: classFilter || undefined,
    days: parseInt(days),
  });

  const classes = useMemo(() => {
    if (!classesData) return [];
    return classesData;
  }, [classesData]);

  const handleToggleGift = async (catechumenId: string) => {
    try {
      await toggleBirthdayGift({
        catechumenId,
        year: new Date().getFullYear(),
      });
    } catch {
      /* silently fail */
    }
  };

  const handleExportCSV = () => {
    if (!birthdays?.length) return;
    const rows = [
      [t("name"), t("birthDate"), t("className"), t("giftDelivered")],
    ];
    birthdays.forEach((b: any) =>
      rows.push([
        b.name,
        formatDate(b.birthDate, currentLocale),
        b.className,
        b.giftDelivered ? tc("yes") : tc("no"),
      ]),
    );
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aniversarios.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("eyebrow", { defaultValue: "Pastoral" })}
        title={t("title")}
        subtitle={t("subtitle", {
          defaultValue: "Acompanhe aniversários e brindes da catequese.",
        })}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-sm"
            onClick={handleExportCSV}
          >
            <Download className="mr-1 h-3 w-3" />
            {t("exportList")}
          </Button>
        }
      />

      <FilterPills
        options={[
          { value: "7", label: t("nextDays", { days: 7 }) },
          { value: "30", label: t("nextDays", { days: 30 }) },
          { value: "60", label: t("nextDays", { days: 60 }) },
        ]}
        value={days}
        onChange={setDays}
      />

      {classes.length > 1 && (
        <select
          className="rounded-sm border border-border/70 bg-white px-3 py-2 text-sm w-full max-w-xs"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">{t("allClasses")}</option>
          {classes.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-sm bg-muted" />
          ))}
        </div>
      ) : !birthdays?.length ? (
        <EmptyState icon={Cake} title={t("noBirthdays")} compact />
      ) : (
        <AppPanel padded={false} className="overflow-hidden">
          <div className="divide-y divide-border/70">
            {birthdays.map((b: any) => (
              <div
                key={b.catechumenId}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-[#D39A2B]">
                    <Cake className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#071A2D]">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("turningAge", { age: b.age })} ·{" "}
                      {formatDate(b.nextBirthday, currentLocale)} ·{" "}
                      <Badge
                        variant="outline"
                        className="rounded-sm px-1 text-[10px]"
                      >
                        {b.className}
                      </Badge>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-9 rounded-sm"
                  variant={b.giftDelivered ? "default" : "outline"}
                  onClick={() => handleToggleGift(b.catechumenId)}
                >
                  <Gift className="mr-1 h-3 w-3" />
                  {b.giftDelivered ? t("markUndelivered") : t("markDelivered")}
                </Button>
              </div>
            ))}
          </div>
        </AppPanel>
      )}
    </div>
  );
}
