import { routes } from "wasp/client/router";
import { BlogUrl, DocsUrl } from "../../../shared/common";
import type { NavigationItem } from "./NavBar";

const staticNavigationItems: NavigationItem[] = [
  { name: "Sobre", to: "/about" },
  { name: "Contato", to: "/contact" },
];

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Funcionalidades", to: "/#features" },
  { name: "Planos", to: "/pricing" },
  ...staticNavigationItems,
] as const;

export const demoNavigationitems: NavigationItem[] = [
  { name: "Painel", to: "/app" },
  { name: "Documentação", to: DocsUrl },
] as const;
