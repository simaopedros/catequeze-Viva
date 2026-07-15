import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Input } from "../../client/components/ui/input";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { FilterPills } from "../../client/components/FilterPills";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { EmptyState } from "../../client/components/EmptyState";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Download,
  List,
  LayoutGrid,
  X,
} from "lucide-react";
import {
  useQuery,
  listLiturgicalEvents,
  listClasses,
  listMeetingsForClasses,
  createLiturgicalEvent,
  deleteLiturgicalEvent,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../client/components/ui/sheet";
import { useUserContext } from "../../client/hooks/useUserContext";

const DEFAULT_COLOR = "#071A2D";

const FAMILY_ROLES = new Set(["GUARDIAN", "CATECHUMEN"]);

export default function CalendarPage() {
  const { t } = useTranslation("calendar");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const isFamily = FAMILY_ROLES.has(userRole);
  const months = useMemo(() => {
    const result = t("months", { returnObjects: true });
    return Array.isArray(result)
      ? (result as string[])
      : [
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ];
  }, [t]);
  const weekdays = useMemo(() => {
    const result = t("weekdays_short", { returnObjects: true });
    return Array.isArray(result)
      ? (result as string[])
      : ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  }, [t]);

  const { activeParishId } = useActiveParish();
  const { data: liturgicalEvents = [], isLoading: loadingLiturgical } =
    useQuery(listLiturgicalEvents);
  const { data: classes = [], isLoading: loadingClasses } =
    useQuery(listClasses);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  // Mobile default: agenda (<768). Desktop stays on month unless user overrides.
  const [viewMode, setViewMode] = useState<"month" | "agenda">(() =>
    typeof window !== "undefined" && window.innerWidth < 768
      ? "agenda"
      : "month",
  );
  const [userPickedView, setUserPickedView] = useState(false);

  useEffect(() => {
    const check = () => {
      if (userPickedView) return;
      setViewMode(window.innerWidth < 768 ? "agenda" : "month");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [userPickedView]);

  const setViewModeManual = (mode: "month" | "agenda") => {
    setUserPickedView(true);
    setViewMode(mode);
  };

  const openMeeting = (meetingId: string) => {
    navigate(`/app/meetings/${meetingId}`);
  };

  const parishFilteredEvents = activeParishId
    ? liturgicalEvents.filter((e: any) => e.parishId === activeParishId)
    : liturgicalEvents;
  const filteredClasses = useMemo(
    () =>
      activeParishId
        ? classes.filter((c: any) => c.parishId === activeParishId)
        : classes,
    [classes, activeParishId],
  );
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [eventType, setEventType] = useState("liturgical");

  useEffect(() => {
    if (!filteredClasses.length) {
      setMeetings([]);
      return;
    }
    setLoadingMeetings(true);
    (async () => {
      try {
        const classIds = filteredClasses.map((c: any) => c.id);
        const mts = (await listMeetingsForClasses({ classIds })) || [];
        const enriched = mts.map((m: any) => ({
          ...m,
          name: m.title || t("meeting_default"),
          type: "class",
          color: "#10b981",
          className:
            filteredClasses.find((c: any) => c.id === m.classId)?.name || "",
          classId: m.classId,
        }));
        setMeetings(enriched);
      } catch (e) {
        console.error("Erro ao carregar encontros:", e);
      }
      setLoadingMeetings(false);
    })();
  }, [classes, activeParishId, filteredClasses, t]);

  const loading = loadingLiturgical || loadingClasses || loadingMeetings;
  const events = [...parishFilteredEvents, ...meetings];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;

  const filteredEvents =
    typeFilter === "all" ? events : events.filter((e) => e.type === typeFilter);
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredEvents
      .filter((e) => {
        const d =
          typeof e.date === "string" ? new Date(e.date) : new Date(e.date);
        return d >= today;
      })
      .sort((a, b) => {
        const da =
          typeof a.date === "string"
            ? new Date(a.date).getTime()
            : new Date(a.date).getTime();
        const db =
          typeof b.date === "string"
            ? new Date(b.date).getTime()
            : new Date(b.date).getTime();
        return da - db;
      });
  }, [filteredEvents]);
  const monthCount = filteredEvents.filter((e) => {
    const d =
      typeof e.date === "string" ? e.date : new Date(e.date).toISOString();
    return new Date(d).getMonth() === month;
  }).length;

  const getEventsForDay = (day: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    return filteredEvents.filter((e) => {
      const d =
        typeof e.date === "string"
          ? e.date
          : new Date(e.date).toISOString().slice(0, 10);
      return d.startsWith(ds);
    });
  };

  const handleCreate = async () => {
    if (!name || !eventDate) return;
    await createLiturgicalEvent({
      name,
      date: eventDate,
      description: desc,
      color,
      type: eventType,
    });
    setName("");
    setDesc("");
    setEventDate("");
    setShowForm(false);
  };
  const handleDelete = async (id: string) => {
    await deleteLiturgicalEvent({ id });
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setShowForm(false);
    setMobilePanelOpen(true);
  };

  const openNewEventForm = (day?: number) => {
    const targetDay = day ?? selectedDay ?? 1;
    setEventDate(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(
        targetDay,
      ).padStart(2, "0")}`,
    );
    setShowForm(true);
  };

  const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const filterOptions = [
    { v: "all", l: t("filters.all") },
    { v: "liturgical", l: t("filters.liturgical") },
    { v: "parish", l: t("filters.parish") },
    { v: "class", l: t("filters.class") },
    { v: "sacramental", l: t("filters.sacramental") },
  ];

  const eventTypeLabels: Record<string, string> = {
    liturgical: t("event_types.liturgical"),
    parish: t("event_types.parish"),
    class: t("event_types.class"),
  };

  const isToday = (day: number) =>
    day === new Date().getDate() &&
    month === new Date().getMonth() &&
    year === new Date().getFullYear();

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-80 rounded-sm bg-muted" />
      </div>
    );

  const activeFilterCount = typeFilter !== "all" ? 1 : 0;

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <AppPageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("month_events", {
          month: months[month],
          year,
          count: monthCount,
        })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-sm border border-border/70 overflow-hidden">
              <Button
                type="button"
                variant={viewMode === "agenda" ? "default" : "ghost"}
                size="sm"
                className="h-10 rounded-none px-3 text-xs"
                onClick={() => setViewModeManual("agenda")}
                aria-pressed={viewMode === "agenda"}
                aria-label={t("view_agenda")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                className="h-10 rounded-none px-3 text-xs"
                onClick={() => setViewModeManual("month")}
                aria-pressed={viewMode === "month"}
                aria-label={t("view_month")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-sm"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-sm text-xs px-3"
              onClick={() => setCurrentDate(new Date())}
            >
              {t("today")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-sm"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              aria-label="Mês seguinte"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isFamily && (
              <Button
                size="sm"
                className="h-10 rounded-sm text-xs px-3 shadow-none"
                onClick={() => openNewEventForm()}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("add_event")}
              </Button>
            )}
          </div>
        }
      />

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterPills
          options={filterOptions.map((f) => ({ value: f.v, label: f.l }))}
          value={typeFilter}
          onChange={setTypeFilter}
          onClear={() => setTypeFilter("all")}
          clearValue="all"
        />
        {activeFilterCount > 0 && (
          <span className="text-overline text-text-tertiary hidden sm:inline-flex items-center gap-1 shrink-0 ml-auto">
            <Calendar className="h-3 w-3" />
            {t("month_events", {
              month: months[month],
              year,
              count: monthCount,
            })}
          </span>
        )}
      </div>

      {/* ── Vista Agenda (mobile) ──────────────────────────────────────── */}
      {viewMode === "agenda" ? (
        <AgendaView
          events={filteredEvents}
          month={month}
          year={year}
          months={months}
          eventTypeLabels={eventTypeLabels}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          setMobilePanelOpen={setMobilePanelOpen}
          onOpenEvent={(e) => {
            if (e.type === "class" && e.id) {
              openMeeting(e.id);
            } else {
              setSelectedDay(
                new Date(
                  typeof e.date === "string" ? e.date : e.date,
                ).getDate(),
              );
              setMobilePanelOpen(true);
            }
          }}
          t={t}
        />
      ) : (
        /* ── Vista Mensal + Painel lateral ─────────────────────────────── */
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          <MonthGrid
            year={year}
            month={month}
            daysInMonth={daysInMonth}
            firstDay={firstDay}
            weekdays={weekdays}
            selectedDay={selectedDay}
            getEventsForDay={getEventsForDay}
            isToday={isToday}
            onDayClick={handleDayClick}
          />

          <div className="hidden lg:block space-y-4">
            <SidePanelContent
              selectedDay={selectedDay}
              month={month}
              year={year}
              months={months}
              dayEvents={dayEvents}
              upcomingEvents={upcomingEvents}
              showForm={showForm && !isFamily}
              name={name}
              desc={desc}
              eventDate={eventDate}
              color={color}
              eventType={eventType}
              setName={setName}
              setDesc={setDesc}
              setEventDate={setEventDate}
              setColor={setColor}
              setEventType={setEventType}
              setShowForm={setShowForm}
              handleCreate={handleCreate}
              handleDelete={handleDelete}
              eventTypeLabels={eventTypeLabels}
              openNewEventForm={openNewEventForm}
              onOpenMeeting={openMeeting}
              allowCreate={!isFamily}
              t={t}
              tc={tc}
            />
          </div>
        </div>
      )}

      {/* ── Mobile day panel: Radix Sheet ─────────────────────────────── */}
      <Sheet
        open={mobilePanelOpen && selectedDay != null}
        onOpenChange={(open) => {
          if (!open) {
            setMobilePanelOpen(false);
            setShowForm(false);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-sm p-0 lg:hidden"
        >
          <SheetHeader className="sticky top-0 z-10 border-b border-border/70 bg-white px-4 py-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-[#071A2D]" />
              {selectedDay != null
                ? t("day_title", { day: selectedDay, month: months[month] })
                : t("title")}
            </SheetTitle>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </SheetHeader>
          <div className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SidePanelContent
              selectedDay={selectedDay}
              month={month}
              year={year}
              months={months}
              dayEvents={dayEvents}
              upcomingEvents={upcomingEvents}
              showForm={showForm && !isFamily}
              name={name}
              desc={desc}
              eventDate={eventDate}
              color={color}
              eventType={eventType}
              setName={setName}
              setDesc={setDesc}
              setEventDate={setEventDate}
              setColor={setColor}
              setEventType={setEventType}
              setShowForm={setShowForm}
              handleCreate={handleCreate}
              handleDelete={handleDelete}
              eventTypeLabels={eventTypeLabels}
              openNewEventForm={openNewEventForm}
              onOpenMeeting={openMeeting}
              allowCreate={!isFamily}
              t={t}
              tc={tc}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Month Grid ──────────────────────────────────────────────────────────────── */

interface MonthGridProps {
  year: number;
  month: number;
  daysInMonth: number;
  firstDay: number;
  weekdays: string[];
  selectedDay: number | null;
  getEventsForDay: (day: number) => any[];
  isToday: (day: number) => boolean;
  onDayClick: (day: number) => void;
}

function MonthGrid({
  year,
  month,
  daysInMonth,
  firstDay,
  weekdays,
  selectedDay,
  getEventsForDay,
  isToday,
  onDayClick,
}: MonthGridProps) {
  const isWeekend = (dow: number) => dow >= 5;

  return (
    <div className="lg:col-span-2 rounded-sm border border-border/70 bg-white overflow-hidden ">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-muted/40 border-b">
        {weekdays.map((d, i) => (
          <div
            key={d}
            className={`p-2 text-center text-xs font-semibold uppercase tracking-wide ${
              isWeekend(i)
                ? "text-muted-foreground/60"
                : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div
            key={`e${i}`}
            className="aspect-square sm:aspect-auto sm:min-h-[90px] border-t border-l bg-muted/5"
          />
        ))}

        {/* Actual day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dow = (firstDay + day - 1) % 7;
          const today = isToday(day);
          const events = getEventsForDay(day);
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => onDayClick(day)}
              aria-label={`${day} ${
                events.length > 0 ? `, ${events.length} events` : ""
              }`}
              aria-current={today ? "date" : undefined}
              className={`p-1.5 sm:p-2 border-t border-l text-left transition-colors flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:z-10 ${
                isSelected
                  ? "z-[1] bg-muted/40 ring-1 ring-inset ring-[#071A2D]/30"
                  : isWeekend(dow)
                    ? "bg-muted/15 hover:bg-muted/30"
                    : "hover:bg-muted/20"
              }`}
            >
              {/* Day number */}
              <span
                className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm text-xs font-semibold tabular-nums sm:h-6 sm:w-6 sm:text-sm ${
                  today
                    ? "bg-[#071A2D] text-white"
                    : isWeekend(dow)
                      ? "text-muted-foreground/60"
                      : "text-[#071A2D]"
                }`}
              >
                {day}
              </span>

              {/* Events */}
              <div className="flex flex-wrap gap-0.5 mt-0.5 sm:mt-1 min-w-0">
                {/* Mobile dots */}
                {events.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="h-1.5 w-1.5 sm:hidden rounded-full flex-shrink-0"
                    style={{ background: e.color || DEFAULT_COLOR }}
                    title={e.name}
                  />
                ))}
                {/* Desktop labels */}
                {events.slice(0, 2).map((e) => (
                  <div
                    key={`lbl-${e.id}`}
                    className="hidden sm:block truncate rounded-sm px-1.5 py-0.5 text-overline font-medium text-white w-full leading-tight"
                    style={{ background: e.color || DEFAULT_COLOR }}
                  >
                    {e.name}
                  </div>
                ))}
                {events.length > 2 && (
                  <span className="text-overline text-muted-foreground hidden sm:inline-block mt-0.5">
                    +{events.length - 2}
                  </span>
                )}
                {events.length > 3 && (
                  <span className="text-overline text-muted-foreground sm:hidden">
                    +{events.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Agenda View ──────────────────────────────────────────────────────────────── */

interface AgendaViewProps {
  events: any[];
  month: number;
  year: number;
  months: string[];
  eventTypeLabels: Record<string, string>;
  selectedDay: number | null;
  setSelectedDay: (d: number) => void;
  setMobilePanelOpen: (v: boolean) => void;
  onOpenEvent: (e: any) => void;
  t: any;
}

function AgendaView({
  events,
  month,
  year,
  months,
  eventTypeLabels,
  selectedDay: _selectedDay,
  setSelectedDay: _setSelectedDay,
  setMobilePanelOpen: _setMobilePanelOpen,
  onOpenEvent,
  t,
}: AgendaViewProps) {
  const monthEvents = events
    .filter((e) => {
      const d =
        typeof e.date === "string" ? e.date : new Date(e.date).toISOString();
      return (
        new Date(d).getMonth() === month && new Date(d).getFullYear() === year
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (monthEvents.length === 0) {
    return <EmptyState compact icon={Calendar} title={t("no_events_month")} />;
  }

  return (
    <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
      {monthEvents.map((e) => {
        const eventDate = new Date(
          typeof e.date === "string" ? e.date : e.date,
        );
        const day = eventDate.getDate();
        return (
          <button
            key={e.id}
            onClick={() => onOpenEvent(e)}
            className="w-full rounded-sm border border-border/70 bg-white p-3.5 text-left hover:bg-muted/30 transition-colors flex items-center gap-3 "
          >
            {/* Date block */}
            <div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-sm border border-border/70 bg-white">
              <span className="text-sm font-semibold leading-none tabular-nums text-[#071A2D]">
                {day}
              </span>
              <span className="text-overline text-muted-foreground mt-0.5">
                {months[month].slice(0, 3)}
              </span>
            </div>

            {/* Color bar */}
            <div
              className="w-1.5 h-9 rounded-full flex-shrink-0"
              style={{ background: e.color || DEFAULT_COLOR }}
            />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {e.name}
                {e.className && (
                  <span className="ml-1 text-overline font-medium text-muted-foreground">
                    ({e.className})
                  </span>
                )}
              </p>
              <p className="text-overline text-muted-foreground mt-0.5">
                {eventTypeLabels[e.type] || e.type}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

/* ─── Side Panel ──────────────────────────────────────────────────────────────── */

interface SidePanelProps {
  selectedDay: number | null;
  month: number;
  year: number;
  months: string[];
  dayEvents: any[];
  upcomingEvents: any[];
  showForm: boolean;
  name: string;
  desc: string;
  eventDate: string;
  color: string;
  eventType: string;
  setName: (v: string) => void;
  setDesc: (v: string) => void;
  setEventDate: (v: string) => void;
  setColor: (v: string) => void;
  setEventType: (v: string) => void;
  setShowForm: (v: boolean) => void;
  handleCreate: () => void;
  handleDelete: (id: string) => void;
  eventTypeLabels: Record<string, string>;
  openNewEventForm: (day?: number) => void;
  onOpenMeeting?: (meetingId: string) => void;
  allowCreate?: boolean;
  t: any;
  tc: (key: string) => string;
}

function SidePanelContent({
  selectedDay,
  month,
  year,
  months,
  dayEvents,
  upcomingEvents,
  showForm,
  name,
  desc,
  eventDate,
  color,
  eventType,
  setName,
  setDesc,
  setEventDate,
  setColor,
  setEventType,
  setShowForm,
  handleCreate,
  handleDelete,
  eventTypeLabels,
  openNewEventForm,
  onOpenMeeting,
  allowCreate = true,
  t,
  tc,
}: SidePanelProps) {
  /* ── No day selected ── show upcoming events ──────────────────────── */
  if (!selectedDay) {
    return (
      <div className="space-y-3 rounded-sm border border-border/70 bg-white p-4">
        <div className="space-y-1.5">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-[#071A2D]" />
            {t("upcoming_events")}
          </h3>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            {t("no_events")}
          </p>
        ) : (
          <div className="space-y-1.5">
            {upcomingEvents.slice(0, 5).map((e: any) => {
              const eventDate = new Date(
                typeof e.date === "string" ? e.date : e.date,
              );
              return (
                <div
                  key={e.id}
                  role={e.type === "class" ? "button" : undefined}
                  tabIndex={e.type === "class" ? 0 : undefined}
                  onClick={() => {
                    if (e.type === "class" && onOpenMeeting) onOpenMeeting(e.id);
                  }}
                  onKeyDown={(ev) => {
                    if (
                      e.type === "class" &&
                      onOpenMeeting &&
                      (ev.key === "Enter" || ev.key === " ")
                    ) {
                      ev.preventDefault();
                      onOpenMeeting(e.id);
                    }
                  }}
                  className={`flex items-center gap-2.5 rounded-sm p-2 hover:bg-muted/30 transition-colors ${
                    e.type === "class" ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="flex w-9 shrink-0 flex-col items-center">
                    <span className="text-xs font-semibold tabular-nums text-[#071A2D]">
                      {eventDate.getDate()}
                    </span>
                    <span className="text-overline text-muted-foreground">
                      {months[eventDate.getMonth()].slice(0, 3)}
                    </span>
                  </div>
                  <div
                    className="w-1 h-7 rounded-full shrink-0"
                    style={{ background: e.color || DEFAULT_COLOR }}
                  />
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-semibold tracking-tight text-[#071A2D]"
                      style={{ fontFamily: "var(--font-brand-display)" }}
                    >
                      {e.name}
                    </p>
                    <p className="text-overline text-muted-foreground">
                      {eventTypeLabels[e.type] || e.type}
                    </p>
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length > 5 && (
              <p className="text-overline text-muted-foreground text-center pt-1">
                +{upcomingEvents.length - 5} {t("more_events")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Day selected ────────────────────────────────────────────────────── */
  return (
    <>
      {/* Day header card */}
      <div className="rounded-sm border border-border/70 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-[#071A2D]" />
              {t("day_title", { day: selectedDay, month: months[month] })}
            </h3>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <Badge variant="outline" className="rounded-sm text-overline">
            {dayEvents.length === 0 ? "0" : String(dayEvents.length)}
          </Badge>
        </div>
      </div>

      {/* Event list */}
      {dayEvents.length === 0 ? (
        <div className="rounded-sm border border-border/70 bg-white p-6 text-center ">
          <p className="text-sm text-muted-foreground">{t("no_events")}</p>
          {allowCreate && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => openNewEventForm()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("add")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((e) => (
            <div
              key={e.id}
              role={e.type === "class" ? "button" : undefined}
              tabIndex={e.type === "class" ? 0 : undefined}
              onClick={() => {
                if (e.type === "class" && onOpenMeeting) onOpenMeeting(e.id);
              }}
              onKeyDown={(ev) => {
                if (
                  e.type === "class" &&
                  onOpenMeeting &&
                  (ev.key === "Enter" || ev.key === " ")
                ) {
                  ev.preventDefault();
                  onOpenMeeting(e.id);
                }
              }}
              className={`flex items-start justify-between rounded-sm border border-border/70 bg-white p-3 hover:bg-muted/20 transition-colors ${
                e.type === "class" ? "cursor-pointer" : ""
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className="w-1.5 h-7 rounded-full mt-1 flex-shrink-0"
                  style={{ background: e.color || DEFAULT_COLOR }}
                />
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {e.name}
                    {e.className && (
                      <span className="ml-1 text-overline font-medium text-muted-foreground">
                        ({e.className})
                      </span>
                    )}
                  </p>
                  {e.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {e.description}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-1.5 text-overline">
                    {eventTypeLabels[e.type] || e.type}
                  </Badge>
                </div>
              </div>
              <div
                className="flex gap-0.5 flex-shrink-0 ml-2"
                onClick={(ev) => ev.stopPropagation()}
              >
                <button
                  onClick={() => exportICS(e)}
                  className="text-muted-foreground hover:text-[#071A2D] p-1.5 rounded-sm hover:bg-muted transition-colors"
                  aria-label="Exportar .ics"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {e.type !== "class" && allowCreate && (
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-sm hover:bg-destructive/10 transition-colors"
                    aria-label="Excluir evento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {allowCreate && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium"
              onClick={() => openNewEventForm()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("new_event")}
            </Button>
          )}
        </div>
      )}

      {/* ── Create event form ───────────────────────────────────────────── */}
      {showForm && allowCreate && (
        <div className="space-y-3 rounded-sm border border-border/70 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Plus className="h-3.5 w-3.5 text-[#071A2D]" />
                {t("new_event")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowForm(false)}
              aria-label={tc("close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2.5">
            <Input
              placeholder={t("event_name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <Input
              placeholder={t("description_optional")}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liturgical">
                  {t("filters.liturgical")}
                </SelectItem>
                <SelectItem value="parish">{t("filters.parish")}</SelectItem>
                <SelectItem value="class">{t("filters.class")}</SelectItem>
                <SelectItem value="sacramental">
                  {t("filters.sacramental")}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Color picker */}
            <div className="relative">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="sr-only"
                id="event-color-picker"
              />
              <label
                htmlFor="event-color-picker"
                className="flex items-center justify-center h-9 w-9 rounded-sm border border-input cursor-pointer hover:border-[#071A2D]/40 transition-colors "
                style={{ background: color }}
                aria-label="Cor do evento"
              >
                <span className="sr-only">Cor do evento</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!name || !eventDate}
            >
              {t("create_event")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── ICS Export ──────────────────────────────────────────────────────────────── */

function exportICS(event: any) {
  const start =
    new Date(event.date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = event.endDate
    ? new Date(event.endDate).toISOString().replace(/[-:]/g, "").split(".")[0] +
      "Z"
    : start;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.name}`,
    `DESCRIPTION:${event.description || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${event.name}.ics`;
  a.click();
}
