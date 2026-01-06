import { apiFetch } from "./client";

export async function getMyProperties({ page = 1, limit = 20, status = "all", q = "" } = {}) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (status && status !== "all") params.set("status", status);
    if (q?.trim()) params.set("q", q.trim());
  
    return apiFetch(`/properties/host/me?${params.toString()}`, { method: "GET" });
  }
  

export async function togglePause(id) {
  return apiFetch(`/properties/host/${id}/toggle-pause`, { method: "POST" });
}

export async function submitForReview(id) {
  return apiFetch(`/properties/host/${id}/submit`, { method: "POST" });
}

export async function deleteProperty(id) {
  return apiFetch(`/properties/host/${id}`, { method: "DELETE" });
}
