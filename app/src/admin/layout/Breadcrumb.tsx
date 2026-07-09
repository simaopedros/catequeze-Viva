import { Link as WaspRouterLink, routes } from "wasp/client/router";
interface BreadcrumbProps {
  pageName: string;
}
const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-title-md2 text-foreground font-semibold">
        {pageName}
      </h2>

      <nav>
        <ul className="flex items-center gap-1">
          <li>
            <WaspRouterLink to={routes.AdminRoute.to}>Dashboard</WaspRouterLink>
          </li>
          <li>/</li>
          <li
            className="font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {pageName}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Breadcrumb;
