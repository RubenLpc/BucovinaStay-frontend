// client/src/api/staysHighlightsService.js
import { apiFetch } from "./client";

export async function getHighlights({ limit = 12, city = "" } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (city?.trim()) params.set("city", city.trim());

  return apiFetch(`/properties/highlights?${params.toString()}`, { method: "GET" });
}
