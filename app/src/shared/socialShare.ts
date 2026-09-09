import { MAX_POST_BODY_LENGTH } from "./socialConstants";

export const COMMUNITY_SHARE_PARAM = "share";

export type CommunityShareDraft = {
  body: string;
  topic?: string;
  source?: string;
};

export function buildCommunitySharePath(draft: CommunityShareDraft): string {
  const params = new URLSearchParams();
  params.set(COMMUNITY_SHARE_PARAM, "1");
  const body = draft.body.trim().slice(0, MAX_POST_BODY_LENGTH);
  if (body) params.set("body", body);
  if (draft.topic) params.set("topic", draft.topic);
  if (draft.source) params.set("from", draft.source);
  return `/app/comunidade?${params.toString()}`;
}

export function parseCommunityShareSearch(
  search: URLSearchParams | string,
): CommunityShareDraft | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  if (params.get(COMMUNITY_SHARE_PARAM) !== "1") return null;
  const body = (params.get("body") || "").trim().slice(0, MAX_POST_BODY_LENGTH);
  const topic = params.get("topic")?.trim() || undefined;
  const source = params.get("from")?.trim() || undefined;
  if (!body && !topic) return null;
  return { body, topic, source };
}

export function stripCommunityShareParams(
  search: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(search);
  next.delete(COMMUNITY_SHARE_PARAM);
  next.delete("body");
  next.delete("topic");
  next.delete("from");
  return next;
}
