import { useQuery, listPublishedBlogPosts } from "wasp/client/operations";

/** Blog links stay hidden until at least one post is published (and while unknown). */
export function useHasBlogPosts(): boolean {
  const { data } = useQuery(
    listPublishedBlogPosts,
    { pageSize: 1 },
    { staleTime: 30 * 60 * 1000, retry: false, refetchOnWindowFocus: false },
  );
  return ((data as { total?: number } | undefined)?.total ?? 0) > 0;
}
