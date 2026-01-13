import { apiFetch } from "./client";

export async function aiSemanticSearch(q, { limit = 8 } = {}) {
  const params = new URLSearchParams({
    q: String(q || "").trim(),
    limit: String(limit),
  });
  return apiFetch(`/search/semantic?${params.toString()}`);
}
