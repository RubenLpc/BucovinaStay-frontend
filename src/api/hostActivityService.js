import { apiFetch } from "./client";

export async function getMyHostActivity({ range = "7d", type = "all", q = "", page = 1, limit = 30 } = {}) {
  const params = new URLSearchParams();
  params.set("range", range);
  params.set("type", type);
  params.set("q", q);
  params.set("page", String(page));
  params.set("limit", String(limit));

  return apiFetch(`/host/activity/me?${params.toString()}`, { method: "GET" });
}
