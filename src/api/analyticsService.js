import { apiFetch } from "./client";

export function getHostListingsStats({ range = "30d" } = {}) {
  return apiFetch(`/analytics/host/listings?range=${encodeURIComponent(range)}`, { method: "GET" });
}

export function getHostOverviewStats({ range = "30d" } = {}) {
  return apiFetch(`/analytics/host/overview?range=${encodeURIComponent(range)}`, { method: "GET" });
}

export function trackClick(listingId, action = "unknown") {
  if (!listingId) return;
  apiFetch("/analytics/click", {
    method: "POST",
    body: JSON.stringify({ listingId, action }),
  }).catch(() => {});
}

export function trackImpression(listingIds = []) {
  if (!Array.isArray(listingIds) || listingIds.length === 0) return;
  apiFetch("/analytics/impression", {
    method: "POST",
    body: JSON.stringify({ listingIds }),
  }).catch(() => {});
}
