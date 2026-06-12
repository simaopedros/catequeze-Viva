import { type AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import { useQuery, listParishes } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import { Activity, Church, Building2, CircleDot, BadgeCheck, AlertTriangle } from 'lucide-react';

const BillingPage = ({ user }: { user: AuthUser }) => {
  const { t, i18n } = useTranslation('billing');
  const { data: parishes = [], isLoading } = useQuery(listParishes);

  const locale = i18n.language.startsWith('en') ? 'en-US' : i18n.language.startsWith('es') ? 'es-ES' : 'pt-BR';

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <BadgeCheck className="h-3.5 w-3.5 text-green-600" />;
      case 'TRIAL': return <CircleDot className="h-3.5 w-3.5 text-blue-600" />;
      case 'PAST_DUE': return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
      case 'CANCELED': return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin_title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('admin_subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">{t('table_entity')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('table_type')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('table_plan')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('table_status')}</th>
                </tr>
              </thead>
              <tbody>
                {parishes.filter((p: any) => p.billing?.plan).map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.type === 'PERSONAL' ? <Activity className="h-4 w-4" /> : p.dioceseId ? <Building2 className="h-4 w-4" /> : <Church className="h-4 w-4" />}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.type || 'PARISH'}</td>
                    <td className="px-4 py-3 text-xs font-medium">{p.billing?.plan}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {statusIcon(p.billing?.status)}
                        <span className="text-xs">{p.billing?.status}</span>
                        {p.billing?.trialEndsAt && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {t('until')} {new Date(p.billing.trialEndsAt).toLocaleDateString(locale)}
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {parishes.filter((p: any) => p.billing?.plan).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {t('no_licenses')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default BillingPage;
