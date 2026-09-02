import { LayoutDashboard, Settings, Shield, Mail } from 'lucide-react';
import { routes } from 'wasp/client/router';

export const userMenuItems = [
  {
    labelKey: 'catechesis_dashboard',
    to: routes.AppDashboardRoute.to,
    icon: LayoutDashboard,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    labelKey: 'support_inbox',
    to: routes.AppSupportRoute.to,
    icon: Mail,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    labelKey: 'account_settings',
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    labelKey: 'admin_panel',
    to: routes.AdminRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;