import { apiFetch } from "./client";

export async function getStats() {
  return apiFetch("/stats");
}
