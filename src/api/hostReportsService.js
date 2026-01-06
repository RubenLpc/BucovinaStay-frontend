// client/src/api/hostReportsService.js
import { apiFetch } from "./client";

export async function getHostOverview({ range = "30d" } = {}) {
  return apiFetch(`/analytics/host/overview?range=${encodeURIComponent(range)}`, { method: "GET" });
}

export async function getHostListingsStats({ range = "30d" } = {}) {
  return apiFetch(`/analytics/host/listings?range=${encodeURIComponent(range)}`, { method: "GET" });
}
