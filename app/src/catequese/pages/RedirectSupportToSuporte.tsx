import { Navigate, useLocation } from "react-router";

/** English /app/support links (emails, old bookmarks) land on the pt-BR route. */
export default function RedirectSupportToSuporte() {
  const { search, hash } = useLocation();
  return <Navigate to={`/app/suporte${search}${hash}`} replace />;
}
