import { apiFetch } from "./client";

function mapPropertyToListing(p) {
  // fallback-uri pentru UI
  const name = p.title || "Fără titlu";
  const location = p.locality || p.city || "—";

  // completion simplu (poți rafina)
  const fields = [
    p.title,
    p.description,
    p.city,
    p.type,
    p.pricePerNight,
    p.capacity,
    (p.images || []).length >= 5 ? "ok" : "",
    p.coverImage?.url || "",
  ];
  const filled = fields.filter(Boolean).length;
  const completion = Math.round((filled / fields.length) * 100);

  return {
    id: p._id,
    name,
    location,
    status: p.status,          // draft|pending|live|paused|rejected
    completion,
    views30: p.stats?.views30 ?? 0,   // încă nu ai stats? 0
    clicks30: p.stats?.clicks30 ?? 0, // încă nu ai stats? 0
    imageUrl: p.coverImage?.url || p.images?.[0]?.url || "",
  };
}

async function getMyListings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await apiFetch(`/properties/host/me${qs ? `?${qs}` : ""}`, { method: "GET" });

  // backend returnează { items, total, page, limit }
  return {
    ...data,
    items: (data.items || []).map(mapPropertyToListing),
  };
}

async function submitForReview(id) {
  return apiFetch(`/properties/host/${id}/submit`, { method: "POST" });
}

async function togglePause(id) {
  return apiFetch(`/properties/host/${id}/toggle-pause`, { method: "POST" });
}

export const hostDashboardService = {
  getMyListings,
  submitForReview,
  togglePause,
};
