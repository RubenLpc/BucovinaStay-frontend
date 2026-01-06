import { apiFetch } from "./client";

/**
 * GET /properties/:id
 * - public vede doar live
 * - logged owner/admin poate vedea draft/pending/rejected/paused
 * protectOptional e în backend, iar apiFetch ar trebui să includă token dacă există.
 */
export async function getPropertyById(id) {
  if (!id) throw new Error("Missing property id");
  return apiFetch(`/properties/${id}`, { method: "GET" });
}
