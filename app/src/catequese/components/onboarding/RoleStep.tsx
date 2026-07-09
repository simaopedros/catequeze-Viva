import { useTranslation } from 'react-i18next';
import { GraduationCap, Users, Heart, Eye } from 'lucide-react';

export type RoleType = 'coordinator' | 'catechist' | 'guardian' | 'viewer';

interface RoleStepProps {
  selected: RoleType | null;
  onSelect: (r: RoleType) => void;
}

const ROLE_META: { id: RoleType; icon: typeof GraduationCap; color: string }[] = [
  {
    id: 'coordinator',
    icon: GraduationCap,
    color: 'border-border/70 bg-muted/30 text-foreground',
  },
  {
    id: 'catechist',
    icon: Users,
    color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400',
  },
  {
    id: 'guardian',
    icon: Heart,
    color: 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950/30 dark:text-pink-400',
  },
  {
    id: 'viewer',
    icon: Eye,
    color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/30 dark:text-purple-400',
  },
];

export function RoleStep({ selected, onSelect }: RoleStepProps) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="rounded-sm border border-border/70 bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold">{t('role_step.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('role_step.subtitle')}</p>

      <div className="grid gap-3">
        {ROLE_META.map(role => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className={`flex items-start gap-4 rounded-sm border p-4 text-left transition-all ${
              selected === role.id
                ? `border-2 shadow-sm ${role.color}`
                : 'hover:bg-muted/30'
            }`}
          >
            <div className={`shrink-0 rounded-full p-3 ${role.color}`}>
              <role.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{t(`roles.${role.id}.title`)}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t(`roles.${role.id}.desc`)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
