import { Languages, MessageSquareQuote, Smartphone, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../client/components/ui/badge";
import { Card } from "../../client/components/ui/card";
import { useScrollReveal } from "../hooks/useScrollReveal";

function useLandingCopy(ns: string) {
  const { t } = useTranslation(ns);
  const { t: tLanding } = useTranslation("landing");

  const trObjects = <T,>(key: string, fallback: T): T => {
    const value = t(key, { returnObjects: true });
    if (value && typeof value === "object") return value as T;
    const fallbackValue = tLanding(key, { returnObjects: true });
    if (fallbackValue && typeof fallbackValue === "object") return fallbackValue as T;
    return fallback;
  };

  return { trObjects };
}

const STAT_ICONS = [Users, Smartphone, Languages] as const;

const DEFAULT_PROOF = {
  badge: "Antes de escolher, entenda se serve para voce",
  title: "A Catequese Viva faz sentido para catequista? Faz. Para a paroquia tambem.",
  subtitle:
    "Voce entra pelo caminho que combina com a sua realidade de hoje: organizar uma turma ou coordenar varias ao mesmo tempo.",
  stats: [
    {
      title: "Para quem cuida de 1 turma",
      desc: "O plano para catequista resolve preparacao, chamada e acompanhamento no dia a dia.",
    },
    {
      title: "Para quem coordena equipes",
      desc: "O plano institucional centraliza turmas, catequistas, familias e presenca.",
    },
    {
      title: "Funciona no celular",
      desc: "A chamada e o acompanhamento da turma podem ser feitos no navegador do proprio celular.",
    },
  ],
  featured: {
    quote:
      "Hoje a coordenacao acompanha presenca, documentos e comunicacao no mesmo lugar. Isso reduziu muito o trabalho espalhado entre papel, planilha e mensagens.",
    name: "Maria Silva",
    role: "Coordenadora paroquial — Campinas, SP",
  },
  chips: ["Chamada no celular", "Importacao por planilha", "Mensagens para familias", "Portal da familia"],
};

export function ProofSection({ ns = "landing" }: { ns?: string }) {
  const { trObjects } = useLandingCopy(ns);
  const proof = trObjects<{
    badge: string;
    title: string;
    subtitle: string;
    stats: Array<{ title: string; desc: string }>;
    featured: { quote: string; name: string; role: string };
    chips: string[];
  }>("proof", DEFAULT_PROOF);
  const { ref, className } = useScrollReveal();

  return (
    <section className="border-y bg-background">
      <div ref={ref} className={`mx-auto max-w-6xl px-4 py-10 md:py-14 ${className}`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="inline-flex gap-1.5 border-0 bg-muted/60 text-text-secondary shadow-none">
                <MessageSquareQuote className="h-3.5 w-3.5" />
                {proof.badge}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{proof.title}</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">{proof.subtitle}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {proof.stats.map((stat, index) => {
                const Icon = STAT_ICONS[index] ?? Users;
                return (
                  <div key={stat.title} className="space-y-2 rounded-2xl border border-border/60 bg-background p-4">
                    <div className="inline-flex rounded-xl bg-muted p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{stat.title}</p>
                    <p className="text-xs leading-relaxed text-text-secondary">{stat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <Card variant="flat" className="rounded-2xl border-border/70 bg-muted/20 p-5 shadow-none">
            <div className="mb-3 flex gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>★</span>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-foreground sm:text-base">&ldquo;{proof.featured.quote}&rdquo;</p>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-semibold text-foreground">{proof.featured.name}</p>
              <p className="text-xs text-text-secondary">{proof.featured.role}</p>
            </div>
            {proof.chips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {proof.chips.map((chip) => (
                  <span key={chip} className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
