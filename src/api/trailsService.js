import { apiFetch } from "./client";

export async function listPublishedTrails({
  page = 1,
  limit = 200,
  q = "",
  difficulty = "all",
  tag = "all",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q?.trim()) params.set("q", q.trim());
  if (difficulty && difficulty !== "all") params.set("difficulty", difficulty);
  if (tag && tag !== "all") params.set("tag", tag);

  return apiFetch(`/trails?${params.toString()}`, { method: "GET" });
}
