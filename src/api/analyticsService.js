// client/src/api/analyticsService.js
import { apiFetch } from "./client";

export function trackImpression(listingIds) {
  if (!listingIds?.length) return;
  apiFetch(`/analytics/impression`, {
    method: "POST",
    body: JSON.stringify({ listingIds }),
  }).catch(() => {});
}

export function trackClick(listingId) {
  apiFetch(`/analytics/click`, {
    method: "POST",
    body: JSON.stringify({ listingId }),
  }).catch(() => {});
}
