import { apiFetch } from "./client";

export function adminGetOverview() {
  return apiFetch("/admin/overview", { method: "GET" });
}

export function adminListUsers({ page = 1, limit = 20, q = "", role = "all" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q?.trim()) params.set("q", q.trim());
  if (role && role !== "all") params.set("role", role);
  return apiFetch(`/admin/users?${params.toString()}`, { method: "GET" });
}

export function adminPatchUser(id, payload) {
  return apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function adminListProperties({ page = 1, limit = 12, q = "", status = "pending" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q?.trim()) params.set("q", q.trim());
  if (status && status !== "all") params.set("status", status);
  return apiFetch(`/admin/properties?${params.toString()}`, { method: "GET" });
}

export function adminSetPropertyStatus(id, payload) {
  return apiFetch(`/admin/properties/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function adminGetSettings() {
  return apiFetch("/admin/settings", { method: "GET" });
}

export function adminSaveSettings(payload) {
  return apiFetch("/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
}

export function adminListReviews({ page = 1, limit = 20, q = "", status = "all", rating = "all", sort = "newest" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q?.trim()) params.set("q", q.trim());
  if (status && status !== "all") params.set("status", status);
  if (rating && rating !== "all") params.set("rating", String(rating));
  if (sort && sort !== "newest") params.set("sort", sort);

  return apiFetch(`/admin/reviews?${params.toString()}`, { method: "GET" });
}

export function adminPatchReview(id, payload) {
  return apiFetch(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function adminDeleteReview(id) {
  return apiFetch(`/admin/reviews/${id}`, { method: "DELETE" });
}

export function adminListTrails({ page = 1, limit = 12, q = "", status = "all", difficulty = "all" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q?.trim()) params.set("q", q.trim());
  if (status && status !== "all") params.set("status", status);
  if (difficulty && difficulty !== "all") params.set("difficulty", difficulty);
  return apiFetch(`/admin/trails?${params.toString()}`, { method: "GET" });
}

export function adminImportTrails(items) {
  return apiFetch("/admin/trails/import", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function adminCreateTrail(payload) {
  return apiFetch("/admin/trails", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminUpdateTrail(id, payload) {
  return apiFetch(`/admin/trails/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function adminDeleteTrail(id) {
  return apiFetch(`/admin/trails/${id}`, { method: "DELETE" });
}

export function adminGetCloudinarySignature({ folder = "trail_images" } = {}) {
  return apiFetch(`/properties/cloudinary-signature?folder=${encodeURIComponent(folder)}`, {
    method: "GET",
  });
}
