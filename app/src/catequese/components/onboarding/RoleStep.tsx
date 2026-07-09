import { useTranslation } from 'react-i18next';
import { GraduationCap, Users, Heart, Eye } from 'lucide-react';

export type RoleType = 'coordinator' | 'catechist' | 'guardian' | 'viewer';

interface RoleStepProps {
  selected: RoleType | null;
  onSelect: (r: RoleType) => void;
}

const ROLE_META: { id: RoleType; icon: typeof GraduationCap }[] = [
  { id: 'coordinator', icon: GraduationCap },
  { id: 'catechist', icon: Users },
  { id: 'guardian', icon: Heart },
  { id: 'viewer', icon: Eye },
];

export function RoleStep({ selected, onSelect }: RoleStepProps) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="space-y-4 rounded-sm border border-border/70 bg-white p-6">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{t('role_step.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('role_step.subtitle')}</p>

      <div className="grid gap-3">
        {ROLE_META.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelect(role.id)}
            className={`flex items-start gap-4 rounded-sm border p-4 text-left transition-colors ${
              selected === role.id
                ? 'border-[#071A2D] bg-muted/30'
                : 'border-border/70 hover:border-primary/30 hover:bg-muted/20'
            }`}
          >
            <div className="shrink-0 rounded-sm border border-border/70 bg-muted/30 p-3 text-foreground">
              <role.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{t(`roles.${role.id}.title`)}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{t(`roles.${role.id}.desc`)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
