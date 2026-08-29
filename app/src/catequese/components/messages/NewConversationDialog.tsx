import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Users,
  MessageSquareText,
  Megaphone,
  Check,
} from "lucide-react";
import { cn } from "../../../client/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { AppGoldRule } from "../../../client/components/brand/AppChrome";
import {
  getContactsForConversation,
  createConversation,
  getOrCreateClassChat,
  listClasses,
} from "wasp/client/operations";
import { useUserContext } from "../../../client/hooks/useUserContext";
import { useActiveWorkspace } from "../../../client/hooks/useActiveWorkspace";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName?: string;
  maskedEmail?: string | null;
  /** @deprecated server no longer returns full email */
  email?: string | null;
  avatarUrl: string | null;
  role?: string;
  hasAccount?: boolean;
  classId?: string;
}

function contactLabel(c: Contact): string {
  if (c.displayName) return c.displayName;
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return c.maskedEmail || c.email || "";
}

interface NewConversationDialogProps {
  isOpen: boolean;
  initialType?: "DIRECT" | "CLASS_CHAT" | "ANNOUNCEMENT" | null;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

const CONVERSATION_TYPE_KEYS = [
  { value: "DIRECT" as const, key: "direct", icon: MessageSquareText },
  { value: "CLASS_CHAT" as const, key: "class_chat", icon: Users },
  { value: "ANNOUNCEMENT" as const, key: "class_notice", icon: Megaphone },
  { value: "GROUP" as const, key: "group", icon: Users },
];

function getInitials(
  firstName: string | null,
  lastName: string | null,
): string {
  return (
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    "?"
  );
}

export function NewConversationDialog({
  isOpen,
  initialType,
  onClose,
  onCreated,
}: NewConversationDialogProps) {
  const { t } = useTranslation("messages");
  const { t: tp } = useTranslation("public");
  const { t: tc } = useTranslation("common");
  const { userRole } = useUserContext();
  const { workspaceId, isPersonal } = useActiveWorkspace();
  const isFamilyRole = ["CATECHUMEN", "GUARDIAN"].includes(userRole);

  const availableTypes = isFamilyRole
    ? CONVERSATION_TYPE_KEYS.filter((item) => item.value === "DIRECT")
    : isPersonal
      ? CONVERSATION_TYPE_KEYS.filter((item) =>
          ["DIRECT", "CLASS_CHAT", "ANNOUNCEMENT"].includes(item.value),
        )
      : CONVERSATION_TYPE_KEYS;

  const [step, setStep] = useState<"type" | "contacts" | "classes">("type");
  const [type, setType] = useState<
    "DIRECT" | "GROUP" | "ANNOUNCEMENT" | "CLASS_CHAT"
  >("DIRECT");
  const [classes, setClasses] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const roleLabel = (role?: string) => {
    if (!role) return "";
    return tp(`workspace.roles.${role}`, { defaultValue: role });
  };

  useEffect(() => {
    if (isOpen && step === "contacts" && workspaceId) {
      setLoading(true);
      getContactsForConversation({ workspaceId })
        .then(setContacts)
        .catch(() => setContacts([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, step, workspaceId]);

  useEffect(() => {
    if (isOpen && step === "classes" && workspaceId) {
      setLoading(true);
      listClasses({ workspaceId, take: 100 } as any)
        .then((data: any) => {
          setClasses(Array.isArray(data) ? data : data?.items || []);
        })
        .catch(() => setClasses([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, step, workspaceId]);

  useEffect(() => {
    if (!isOpen) {
      setStep("type");
      setType("DIRECT");
      setTitle("");
      setSearch("");
      setSelected(new Set());
      setError("");
      return;
    }
    if (initialType === "CLASS_CHAT" || initialType === "ANNOUNCEMENT") {
      setType(initialType);
      setStep("classes");
    } else if (initialType === "DIRECT") {
      setType("DIRECT");
      setStep("contacts");
    } else {
      setStep("type");
    }
  }, [isOpen, initialType]);

  const filteredContacts = contacts.filter((c) => {
    if (!search) return true;
    const name = [contactLabel(c), c.maskedEmail, c.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const toggleContact = (id: string) => {
    const next = new Set(selected);
    if (type === "DIRECT") {
      next.clear();
      next.add(id);
    } else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
    setSelected(next);
  };

  const openClassChat = async (classId: string) => {
    setCreating(true);
    setError("");
    try {
      const { conversationId } = await getOrCreateClassChat({ classId });
      onCreated(conversationId);
      onClose();
    } catch (e: any) {
      setError(e.message || t("new_dialog.create_error"));
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = async () => {
    if (!workspaceId) {
      setError(t("new_dialog.create_error"));
      return;
    }
    if (selected.size === 0) {
      setError(t("new_dialog.select_participant"));
      return;
    }
    if (type !== "DIRECT" && type !== "CLASS_CHAT" && !title.trim()) {
      setError(t("new_dialog.name_group"));
      return;
    }

    const selectedContacts = contacts.filter((c) => selected.has(c.id));
    const withoutAccount = selectedContacts.filter((c) => c.hasAccount === false);
    if (type === "DIRECT" && withoutAccount.length > 0) {
      const classId = withoutAccount[0].classId;
      if (classId) {
        await openClassChat(classId);
        return;
      }
      setError(t("new_dialog.enrolled_no_account"));
      return;
    }

    setCreating(true);
    setError("");
    try {
      const conversation = await createConversation({
        type: type === "CLASS_CHAT" ? "DIRECT" : type,
        title: type !== "DIRECT" ? title.trim() : undefined,
        participantUserIds: selectedContacts
          .filter((c) => c.hasAccount !== false && !String(c.id).startsWith("profile:"))
          .map((c) => c.id),
        parishId: workspaceId,
      });
      onCreated(conversation.id);
      onClose();
    } catch (e: any) {
      setError(e.message || t("new_dialog.create_error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // sem texto descritivo neste diálogo; explicitar undefined evita que o
        // Radix gere um aria-describedby apontando para um id inexistente
        aria-describedby={undefined}
        className="gap-0 p-0 sm:max-w-md sm:p-0"
      >
        <DialogHeader className="space-y-1.5 border-b border-border/70 p-4 pr-14">
          <DialogTitle className="text-base">
            {step === "type"
              ? t("new_dialog.title_type")
              : step === "classes"
                ? t("new_dialog.pick_class")
                : t("new_dialog.title_contacts")}
          </DialogTitle>
          <AppGoldRule className="w-8" />
        </DialogHeader>

        {step === "type" && (
          <div className="p-4 space-y-2">
            {availableTypes.map((ct) => {
              const Icon = ct.icon;
              return (
                <button
                  key={ct.value}
                  onClick={() => {
                    setType(ct.value);
                    setStep(
                      ct.value === "CLASS_CHAT" || ct.value === "ANNOUNCEMENT"
                        ? "classes"
                        : "contacts",
                    );
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-sm border border-border/70 p-3 text-left transition-colors hover:border-brand-ink/30 hover:bg-muted/20",
                    type === ct.value && "border-brand-ink bg-muted/30",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-brand-ink">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-brand-ink">
                      {t(`new_dialog.types.${ct.key}.label`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`new_dialog.types.${ct.key}.desc`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === "classes" && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("new_dialog.pick_class")}
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="max-h-64 overflow-y-auto border-t scrollbar-thin">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t("new_dialog.loading_contacts")}
                </div>
              ) : classes.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t("new_dialog.no_classes")}
                </div>
              ) : (
                classes.map((cls: any) => (
                  <button
                    key={cls.id}
                    type="button"
                    disabled={creating}
                    onClick={() => openClassChat(cls.id)}
                    className="w-full border-b px-3 py-3 text-left hover:bg-muted/30"
                  >
                    <p className="text-sm font-semibold tracking-tight text-brand-ink">
                      {cls.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cls._count?.enrollments ?? cls.enrollmentCount ?? 0}{" "}
                      {tc("enrolled")}
                    </p>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => {
                setStep("type");
                setError("");
              }}
              className="text-xs text-muted-foreground hover:text-brand-ink"
            >
              {t("new_dialog.back")}
            </button>
          </div>
        )}

        {step === "contacts" && (
          <>
            <div className="p-4 space-y-3">
              {type !== "DIRECT" && (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("new_dialog.group_name_placeholder")}
                  aria-label={t("new_dialog.group_name_placeholder")}
                  maxLength={200}
                  className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                />
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("new_dialog.search_contacts")}
                  aria-label={t("new_dialog.search_contacts")}
                  className="h-9 w-full rounded-sm border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                />
              </div>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selected).map((id) => {
                    const c = contacts.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-semibold tracking-tight text-brand-ink"
                      >
                        {contactLabel(c) || c.firstName}
                        <button
                          type="button"
                          onClick={() => toggleContact(id)}
                          aria-label={`${tc("remove")}: ${
                            contactLabel(c) || c.firstName
                          }`}
                          className="hover:text-destructive"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="max-h-64 overflow-y-auto border-t scrollbar-thin">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t("new_dialog.loading_contacts")}
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t("new_dialog.no_contacts")}
                </div>
              ) : (
                filteredContacts.map((c) => {
                  const isSelected = selected.has(c.id);
                  const name = contactLabel(c) || t("default_user");
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleContact(c.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isSelected ? "bg-muted/30" : "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand-ink text-overline font-semibold text-white">
                        {getInitials(c.firstName, c.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight text-brand-ink">
                          {name}
                        </p>
                        <p className="text-overline text-muted-foreground truncate">
                          {c.hasAccount === false
                            ? t("new_dialog.enrolled_no_account")
                            : c.role
                              ? roleLabel(c.role)
                              : c.maskedEmail || null}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-sm border-2 transition-colors",
                          isSelected
                            ? "bg-brand-ink border-brand-ink text-white"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setStep("type");
                  setSelected(new Set());
                  setError("");
                }}
                className="text-xs text-muted-foreground hover:text-brand-ink"
              >
                {t("new_dialog.back")}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || selected.size === 0}
                className={cn(
                  "px-4 py-2 rounded-sm text-sm font-medium transition-all",
                  selected.size > 0
                    ? "bg-brand-ink text-white hover:bg-brand-ink-soft"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {creating
                  ? t("new_dialog.creating")
                  : type === "DIRECT"
                    ? t("new_dialog.start_direct")
                    : t("new_dialog.create_group", { count: selected.size })}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
