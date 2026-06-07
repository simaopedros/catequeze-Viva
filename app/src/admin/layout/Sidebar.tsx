import { LayoutDashboard, Sheet, X, Building2, Church, BarChart3, Bell, ShieldCheck, Settings, Activity } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import Logo from "../../client/static/logo.webp";
import { cn } from "../../client/utils";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true",
  );

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
      { "bg-accent text-accent-foreground": isActive }
    );

  return (
    <aside
      ref={sidebar}
      className={cn(
        "bg-muted absolute top-0 left-0 z-9999 flex h-screen w-64 flex-col overflow-y-hidden border-r duration-300 ease-linear lg:static lg:translate-x-0",
        { "translate-x-0": sidebarOpen, "-translate-x-full": !sidebarOpen },
      )}
    >
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <NavLink to="/">
          <img src={Logo} alt="Logo" width={50} />
        </NavLink>
        <button ref={trigger} onClick={() => setSidebarOpen(!sidebarOpen)} aria-controls="sidebar" aria-expanded={sidebarOpen} className="block lg:hidden">
          <X />
        </button>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-5 px-4 py-4 lg:mt-9 lg:px-6">

          {/* VISÃO GERAL */}
          <div>
            <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">VISÃO GERAL</h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              <li>
                <NavLink to="/admin" end className={navLinkClass}>
                  <LayoutDashboard />Painel
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/analytics" end className={navLinkClass}>
                  <BarChart3 />Analytics
                </NavLink>
              </li>
            </ul>
          </div>

          {/* GOVERNANÇA */}
          <div>
            <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">GOVERNANÇA</h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              <li>
                <NavLink to="/admin/parishes" end className={navLinkClass}>
                  <Church />Paróquias
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/users" end className={navLinkClass}>
                  <Sheet />Utilizadores
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/dioceses" end className={navLinkClass}>
                  <Building2 />Dioceses
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/billing" end className={navLinkClass}>
                  <Activity />Licenças
                </NavLink>
              </li>
            </ul>
          </div>

          {/* OPERAÇÕES — future links, disabled for now */}
          <div>
            <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">OPERAÇÕES</h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              <li>
                <NavLink to="/admin/support" end className={navLinkClass}>
                  <Bell />Suporte
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/audit" end className={navLinkClass}>
                  <ShieldCheck />Auditoria
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/system" end className={navLinkClass}>
                  <Settings />Sistema
                </NavLink>
              </li>
            </ul>
          </div>

          {/* OUTROS */}
          <div>
            <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">OUTROS</h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              <li>
                <NavLink to="/app" end className={navLinkClass}>
                  <LayoutDashboard />Voltar ao App
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
