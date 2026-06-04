import { GraduationCap, Users, Heart, Eye } from 'lucide-react';

export type RoleType = 'coordinator' | 'catechist' | 'guardian' | 'viewer';

interface RoleStepProps {
  selected: RoleType | null;
  onSelect: (r: RoleType) => void;
}

const ROLES = [
  {
    id: 'coordinator' as RoleType,
    title: 'Coordenador(a) Paroquial',
    description: 'Geres a catequese da paróquia: turmas, catequistas, sacramentos e relatórios.',
    icon: GraduationCap,
    color: 'bg-primary/10 text-primary border-primary/30',
  },
  {
    id: 'catechist' as RoleType,
    title: 'Catequista',
    description: 'Dás aulas de catequese e acompanhas os teus catequizandos.',
    icon: Users,
    color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400',
  },
  {
    id: 'guardian' as RoleType,
    title: 'Responsável (Pai / Mãe)',
    description: 'Acompanhas a jornada de fé dos teus filhos na catequese.',
    icon: Heart,
    color: 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950/30 dark:text-pink-400',
  },
  {
    id: 'viewer' as RoleType,
    title: 'Liderança Pastoral',
    description: 'Visão de acompanhamento: vês turmas, presenças e relatórios sem editar.',
    icon: Eye,
    color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/30 dark:text-purple-400',
  },
];

export function RoleStep({ selected, onSelect }: RoleStepProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold">Qual o teu papel na paróquia?</h2>
      <p className="text-sm text-muted-foreground">Escolhe o perfil que melhor descreve a tua atuação.</p>

      <div className="grid gap-3">
        {ROLES.map(role => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
              selected === role.id
                ? `border-2 shadow-sm ${role.color}`
                : 'hover:bg-muted/30'
            }`}
          >
            <div className={`shrink-0 rounded-full p-3 ${role.color}`}>
              <role.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{role.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
