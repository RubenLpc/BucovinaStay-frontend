import { apiFetch } from "./client";

export async function getMyHostProfile() {
  return apiFetch("/host/me", { method: "GET" });
}

export async function updateMyHostProfile(patch) {
  return apiFetch("/host/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function getHostProfilePublic(userId) {
  return apiFetch(`/host/public/${userId}`, { method: "GET" });
}
