import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { useQuery, searchSocial } from "wasp/client/operations";
import { Input } from "../../../client/components/ui/input";
import { communityProfilePath } from "../../../shared/socialProfile";

export function SocialSearch({ className }: { className?: string }) {
  const { t } = useTranslation("social");
  const location = useLocation();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const { data } = useQuery(
    searchSocial,
    { q: debounced },
    { enabled: debounced.length >= 2 },
  );
  const people = data?.people ?? [];
  const posts = data?.posts ?? [];
  const open = debounced.length >= 2;

  return (
    <div className={className}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t("search.placeholder")}
          className="h-10 rounded-[11px] border-[#e1e7ee] pl-9"
          aria-label={t("search.placeholder")}
        />
      </label>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {people.length === 0 && posts.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {t("search.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {people.map((person: any) => (
                <li key={person.id}>
                  <Link
                    to={communityProfilePath(person.socialHandle, location.pathname)}
                    className="block px-3 py-2 text-sm hover:bg-muted/60"
                  >
                    <span className="font-medium">{person.displayName}</span>
                    <span className="ml-2 text-muted-foreground">
                      @{person.socialHandle}
                    </span>
                  </Link>
                </li>
              ))}
              {posts.map((post: any) => (
                <li key={post.id}>
                  <Link
                    to={`/comunidade/p/${post.slug}`}
                    className="block px-3 py-2 text-sm hover:bg-muted/60"
                  >
                    <span className="line-clamp-2">{post.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
