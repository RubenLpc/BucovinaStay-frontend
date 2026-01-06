import { apiFetch } from "./client";

export function getPropertyReviews(id, { page = 1, limit = 10 } = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  return apiFetch(`/properties/${id}/reviews?${qs.toString()}`, { method: "GET" });
}

export function getMyPropertyReview(id) {
  return apiFetch(`/properties/${id}/reviews/me`, { method: "GET" });
}

export function createPropertyReview(id, payload) {
  return apiFetch(`/properties/${id}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deletePropertyReview(id, reviewId) {
  return apiFetch(`/properties/${id}/reviews/${reviewId}`, { method: "DELETE" });
}
