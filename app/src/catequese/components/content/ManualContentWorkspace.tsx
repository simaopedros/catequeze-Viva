import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Card } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import { Input } from "../../../client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { ReferencePicker } from "../../../client/components/ReferencePicker";
import { MeetingEditor } from "../collaborative/MeetingEditor";
import {
  CollaborativeProvider,
  useCollaborative,
} from "../collaborative/CollaborativeContext";
import {
  getContentItem,
  listContentItems,
  addBibleRef,
  removeBibleRef,
  addCatechismRef,
  removeCatechismRef,
  addDirectoryRef,
  removeDirectoryRef,
  useQuery,
} from "wasp/client/operations";
import {
  Feather,
  BookOpen,
  Loader2,
  Search,
  Clock3,
  Eye,
  Save,
  ChevronRight,
  Plus,
  ScrollText,
  Library,
  BookMarked,
  NotebookPen,
  MoreHorizontal,
  CircleHelp,
  Users,
} from "lucide-react";
import { toast } from "../../../client/hooks/use-toast";
import {
  AppDisplayTitle,
  AppEyebrow,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";

const RECENT_THUMBNAIL_STYLES = [
  "bg-[#071A2D]/08 text-[#071A2D]",
  "bg-[#D39A2B]/15 text-[#8A6418]",
  "bg-muted/40 text-[#071A2D]",
  "bg-muted/70 text-muted-foreground",
];

type ReferenceTab = "bible" | "catechism" | "directory";

function SelectedChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-semibold tracking-tight text-[#071A2D]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        ×
      </button>
    </span>
  );
}

function ReferenceSection({
  title,
  icon: Icon,
  placeholder,
  count,
  onOpen,
  children,
}: {
  title: string;
  icon: typeof BookOpen;
  placeholder: string;
  count: number;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-sm bg-muted/40 text-[#071A2D]">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div
              className="text-sm font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {title}
            </div>
            <div className="text-xs text-muted-foreground">
              {count} selecionadas
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-medium text-[#071A2D]"
        >
          Selecionar
        </button>
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className="pl-9"
          readOnly
          onFocus={onOpen}
        />
      </div>
      {children}
    </div>
  );
}

function ReferencesSidebar({ contentId }: { contentId: string }) {
  const { data: item, isLoading } = useQuery(getContentItem, { id: contentId });
  const [bibleRefs, setBibleRefs] = useState<
    { id?: string; verseId: string; label: string; text?: string }[]
  >([]);
  const [catechismRefs, setCatechismRefs] = useState<
    {
      id?: string;
      entryId: string;
      label: string;
      question?: string;
      answer?: string;
    }[]
  >([]);
  const [directoryRefs, setDirectoryRefs] = useState<
    { id?: string; entryId: string; label: string; content?: string }[]
  >([]);
  const [activePicker, setActivePicker] = useState<ReferenceTab | null>(null);

  useEffect(() => {
    if (!item) return;
    setBibleRefs(
      (item.bibleRefs || []).map((r: any) => ({
        id: r.id,
        verseId: r.verseId,
        label: `${
          r.verse?.chapter?.book?.abbreviation ||
          r.verse?.chapter?.book?.name ||
          ""
        } ${r.verse?.chapter?.number}:${r.verse?.number}`,
        text: r.verse?.text,
      })),
    );
    setCatechismRefs(
      (item.catechismRefs || []).map((r: any) => ({
        id: r.id,
        entryId: r.entryId,
        label: `CIC ${r.entry?.number}`,
        question: r.entry?.question,
        answer: r.entry?.answer,
      })),
    );
    setDirectoryRefs(
      ((item as any).directoryRefs || []).map((r: any) => ({
        id: r.id,
        entryId: r.entryId,
        label: `DC ${r.entry?.number}`,
        content: r.entry?.content,
      })),
    );
  }, [item]);

  const totalRefs =
    bibleRefs.length + catechismRefs.length + directoryRefs.length;
  const onError = (message: string) =>
    toast({ title: "Erro", description: message, variant: "destructive" });

  const handleRemoveBible = async (id?: string, verseId?: string) => {
    try {
      if (id) await removeBibleRef({ id });
      setBibleRefs((prev) =>
        prev.filter((r) => (r.id || r.verseId) !== (id || verseId)),
      );
    } catch (e: any) {
      onError(e.message);
    }
  };

  const handleRemoveCatechism = async (id?: string, entryId?: string) => {
    try {
      if (id) await removeCatechismRef({ id });
      setCatechismRefs((prev) =>
        prev.filter((r) => (r.id || r.entryId) !== (id || entryId)),
      );
    } catch (e: any) {
      onError(e.message);
    }
  };

  const handleRemoveDirectory = async (id?: string, entryId?: string) => {
    try {
      if (id) await removeDirectoryRef({ id });
      setDirectoryRefs((prev) =>
        prev.filter((r) => (r.id || r.entryId) !== (id || entryId)),
      );
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-sm border-border/70 p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 shrink-0 text-[#071A2D]" />
                <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
                  Referências para o encontro
                </AppDisplayTitle>
              </div>
              <AppGoldRule />
              <p className="text-sm text-muted-foreground">
                Selecione e organize referências.
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="rounded-sm px-2.5 py-0.5 text-xs"
          >
            {totalRefs}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando referências
          </div>
        ) : (
          <div className="space-y-3">
            <ReferenceSection
              title="Bíblia Sagrada"
              icon={BookOpen}
              placeholder="Buscar passagem ou referência..."
              count={bibleRefs.length}
              onOpen={() => setActivePicker("bible")}
            >
              <div className="flex min-h-8 flex-wrap gap-2">
                {bibleRefs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma passagem selecionada.
                  </span>
                ) : (
                  bibleRefs.map((ref) => (
                    <SelectedChip
                      key={ref.id || ref.verseId}
                      label={ref.label}
                      onRemove={() => handleRemoveBible(ref.id, ref.verseId)}
                    />
                  ))
                )}
              </div>
            </ReferenceSection>

            <ReferenceSection
              title="Catecismo da Igreja Católica"
              icon={NotebookPen}
              placeholder="Buscar número do Catecismo..."
              count={catechismRefs.length}
              onOpen={() => setActivePicker("catechism")}
            >
              <div className="flex min-h-8 flex-wrap gap-2">
                {catechismRefs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma referência selecionada.
                  </span>
                ) : (
                  catechismRefs.map((ref) => (
                    <SelectedChip
                      key={ref.id || ref.entryId}
                      label={ref.label}
                      onRemove={() =>
                        handleRemoveCatechism(ref.id, ref.entryId)
                      }
                    />
                  ))
                )}
              </div>
            </ReferenceSection>

            <ReferenceSection
              title="Diretório para a Catequese"
              icon={ScrollText}
              placeholder="Buscar número do Diretório..."
              count={directoryRefs.length}
              onOpen={() => setActivePicker("directory")}
            >
              <div className="flex min-h-8 flex-wrap gap-2">
                {directoryRefs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma referência selecionada.
                  </span>
                ) : (
                  directoryRefs.map((ref) => (
                    <SelectedChip
                      key={ref.id || ref.entryId}
                      label={ref.label}
                      onRemove={() =>
                        handleRemoveDirectory(ref.id, ref.entryId)
                      }
                    />
                  ))
                )}
              </div>
            </ReferenceSection>

            <div className="rounded-sm border border-border bg-muted/20 p-4">
              <div
                className="mb-2 text-sm font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                Referências selecionadas
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Bíblia Sagrada</span>
                  <span>{bibleRefs.length} referências</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Catecismo da Igreja Católica</span>
                  <span>{catechismRefs.length} referências</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Diretório para a Catequese</span>
                  <span>{directoryRefs.length} referências</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {activePicker && (
        <Card className="rounded-sm border-border/70 p-2">
          <ReferencePicker
            bibleRefs={bibleRefs}
            catechismRefs={catechismRefs}
            directoryRefs={directoryRefs}
            onAddBible={async (verseId, label, text) => {
              try {
                const result = await addBibleRef({ contentId, verseId });
                setBibleRefs((prev) => [
                  ...prev,
                  { id: result.id, verseId, label, text },
                ]);
              } catch (e: any) {
                onError(e.message);
              }
            }}
            onRemoveBible={async (id) => handleRemoveBible(id)}
            onAddCatechism={async (entryId, label, question) => {
              try {
                const result = await addCatechismRef({ contentId, entryId });
                setCatechismRefs((prev) => [
                  ...prev,
                  { id: result.id, entryId, label, question },
                ]);
              } catch (e: any) {
                onError(e.message);
              }
            }}
            onRemoveCatechism={async (id) => handleRemoveCatechism(id)}
            onAddDirectory={async (entryId, label, content) => {
              try {
                const result = await addDirectoryRef({ contentId, entryId });
                setDirectoryRefs((prev) => [
                  ...prev,
                  { id: result.id, entryId, label, content },
                ]);
              } catch (e: any) {
                onError(e.message);
              }
            }}
            onRemoveDirectory={async (id) => handleRemoveDirectory(id)}
          />
        </Card>
      )}

      <Card className="rounded-sm border-border/70 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-sm px-2.5 py-0.5 text-xs"
          >
            Assistência opcional
          </Badge>
        </div>
        <div className="space-y-3">
          <div>
            <h3
              className="text-sm font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              Sugestões quando você quiser acelerar
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A assistência editorial entra só como apoio, por bloco ou no hub
              de encontros.
            </p>
          </div>
          <div className="space-y-2">
            {[
              "Sugerir objetivo pastoral",
              "Sugerir dinâmica para esta faixa etária",
              "Sugerir oração inicial",
              "Sugerir compromisso para a família",
            ].map((label) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-sm border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium text-[#071A2D]">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full justify-start rounded-sm gap-2"
          >
            <Feather className="h-4 w-4" /> Abrir assistência editorial
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ContentLibrarySidebar() {
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useQuery(listContentItems, {
    take: 4,
  });

  const filteredItems = search.trim()
    ? items.filter((item: any) =>
        `${item.title || ""} ${item.theme || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : items;

  return (
    <div className="space-y-4">
      <Card className="rounded-sm border-border/70 p-4">
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 shrink-0 text-[#071A2D]" />
            <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
              Biblioteca de conteúdos
            </AppDisplayTitle>
          </div>
          <AppGoldRule />
          <p className="text-sm text-muted-foreground">
            Inspire-se e reutilize materiais.
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conteúdos..."
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Filtros</span>
            <button type="button" className="text-[#071A2D]">
              Limpar
            </button>
          </div>
          {[
            "Tipo de conteúdo",
            "Faixa etária",
            "Temas",
            "Tempo de encontro",
            "Dificuldade",
          ].map((label) => (
            <button
              key={label}
              type="button"
              className="flex w-full items-center justify-between rounded-sm border border-border bg-background px-3 py-2.5 text-sm font-medium tracking-tight text-[#071A2D]"
            >
              <span>{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-sm border-border/70 p-4">
        <div className="mb-4 space-y-2">
          <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
            Conteúdos recentes
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-sm text-muted-foreground">
            Retome rascunhos e reaproveite encontros.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> carregando
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item: any, index: number) => (
              <Link
                key={item.id}
                to={`/app/content-library/${item.id}`}
                className="flex items-start gap-3 rounded-sm border border-border bg-background p-3"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-sm ${
                    RECENT_THUMBNAIL_STYLES[
                      index % RECENT_THUMBNAIL_STYLES.length
                    ]
                  }`}
                >
                  <ScrollText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div
                    className="line-clamp-2 text-sm font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {item.title || "Rascunho sem título"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.theme || "Sem tema definido"}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {item.theme || "Faixa etária não definida"}
                  </div>
                </div>
              </Link>
            ))}
            <Button
              variant="outline"
              asChild
              className="w-full justify-between rounded-sm"
            >
              <Link to="/app/content-library">
                Ver todos os conteúdos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function HeaderSection({ backTo }: { backTo: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#071A2D]"
          >
            Voltar
          </Link>
          <div className="space-y-2.5">
            <AppEyebrow>Encontros</AppEyebrow>
            <AppDisplayTitle>Conteúdo</AppDisplayTitle>
            <AppGoldRule />
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              Crie encontros manualmente e use assistência só quando fizer
              sentido
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <Button className="h-auto rounded-sm bg-[#071A2D] px-6 py-4 text-left shadow-none hover:bg-[#0a2540]">
            <div className="flex items-start gap-3">
              <Plus className="mt-1 h-4 w-4" />
              <div>
                <div className="text-sm font-semibold tracking-tight text-white">
                  Criar manualmente
                </div>
                <div className="text-xs text-white/90">
                  Construa seu encontro do zero
                </div>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto rounded-sm border-[#D39A2B]/50 px-6 py-4 text-left"
          >
            <div className="flex items-start gap-3">
              <Feather className="mt-1 h-4 w-4 text-[#071A2D]" />
              <div>
                <div className="text-sm font-semibold text-[#071A2D]">
                  Assistência editorial
                </div>
                <div className="text-xs text-muted-foreground">
                  Sugestões para o encontro
                </div>
              </div>
            </div>
          </Button>
          <Button variant="outline" size="icon" className="rounded-sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="gap-2 rounded-sm">
            <CircleHelp className="h-4 w-4" /> Ajuda
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkspaceTopBar({
  contentItemId,
  estimatedTime,
}: {
  contentItemId: string;
  estimatedTime?: number | null;
}) {
  return (
    <Card className="rounded-sm border-border/70 px-4 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-4 text-sm">
          <div className="text-muted-foreground">Rascunho salvo há 2 min</div>
          <div className="hidden h-5 w-px bg-border xl:block" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Encontro para:</span>
            <Select defaultValue="criancas">
              <SelectTrigger className="h-9 w-[220px] rounded-sm border-0 bg-transparent px-0 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="criancas">Catequese de Crianças</SelectItem>
                <SelectItem value="adolescentes">
                  Catequese de Adolescentes
                </SelectItem>
                <SelectItem value="adultos">Catequese de Adultos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Faixa etária:</span>
            <Select defaultValue="9-11">
              <SelectTrigger className="h-9 w-[120px] rounded-sm border-0 bg-transparent px-0 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7-9">7 a 9 anos</SelectItem>
                <SelectItem value="9-11">9 a 11 anos</SelectItem>
                <SelectItem value="12-14">12 a 14 anos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>Duração:</span>
            <Select defaultValue={String(estimatedTime || 60)}>
              <SelectTrigger className="h-9 w-[90px] rounded-sm border-0 bg-transparent px-0 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="gap-2 rounded-sm text-base">
            <Save className="h-4 w-4" /> Salvar
          </Button>
          <Button asChild className="rounded-sm px-5 gap-2">
            <Link to={`/app/content-library/${contentItemId}`}>
              <Eye className="h-4 w-4" /> Visualizar
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ManualContentWorkspaceInner({
  existingContentId,
  source = "library",
}: {
  existingContentId?: string;
  source?: "library" | "hub";
}) {
  const {
    startSession,
    setupComplete,
    generating,
    contentItemId,
    contentItem,
  } = useCollaborative();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startRequestedRef = useRef(false);

  useEffect(() => {
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    let cancelled = false;
    setLoadError(null);
    startSession({
      intent: "create_meeting",
      theme: existingContentId ? "Editar encontro" : "Novo encontro",
      ageGroup: "Adultos",
      duration: 60,
      approach: "mixed",
      contentId: existingContentId,
      applyToOriginal: !!existingContentId,
      manualCreation: true,
      source: source === "hub" ? "widget" : "library",
    }).catch((error: any) => {
      if (cancelled) return;
      setLoadError(
        error?.message || "Não foi possível preparar o editor manual.",
      );
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, existingContentId, source, startSession]);

  const backTo = useMemo(
    () => (source === "hub" ? "/app/ai-hub" : "/app/content-library"),
    [source],
  );

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="space-y-4 rounded-sm border-border/70 p-8">
          <p className="text-sm text-destructive">{loadError}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                startRequestedRef.current = false;
                setLoadError(null);
                setAttempt((current) => current + 1);
              }}
            >
              Tentar novamente
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/content-library">Voltar para conteúdo</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!setupComplete || generating || !contentItemId) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <HeaderSection backTo={backTo} />
        <Card className="rounded-sm border-border/70 p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> preparando rascunho do
            encontro
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1680px] space-y-6 pb-8">
      <HeaderSection backTo={backTo} />
      <WorkspaceTopBar
        contentItemId={contentItemId}
        estimatedTime={contentItem?.estimatedTime}
      />
      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
        <ContentLibrarySidebar />
        <Card className="rounded-sm border-border/70 p-0">
          <MeetingEditor />
        </Card>
        <ReferencesSidebar contentId={contentItemId} />
      </div>
    </div>
  );
}

export function ManualContentWorkspace(props: {
  existingContentId?: string;
  source?: "library" | "hub";
}) {
  return (
    <CollaborativeProvider>
      <ManualContentWorkspaceInner {...props} />
    </CollaborativeProvider>
  );
}
