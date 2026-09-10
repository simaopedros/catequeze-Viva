import { Link as WaspRouterLink, routes } from "wasp/client/router";
interface BreadcrumbProps {
  pageName: string;
}
const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="font-brand-display text-title-md2 font-semibold tracking-tight text-brand-ink">
        {pageName}
      </h2>

      <nav>
        <ul className="flex items-center gap-1">
          <li>
            <WaspRouterLink to={routes.AdminRoute.to}>Dashboard</WaspRouterLink>
          </li>
          <li>/</li>
          <li className="font-semibold tracking-tight text-brand-ink">
            {pageName}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Breadcrumb;
