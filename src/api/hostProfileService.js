import { apiFetch } from "./client";

// ---- named exports (compat) ----
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

// Optional: doar dacă ai deja endpoint-ul în backend.
// Exemplu: /uploads/cloudinary-signature?folder=host_avatars
export async function getCloudinarySignature({ folder = "host_avatars" } = {}) {
  return apiFetch(`/properties/cloudinary-signature?folder=${encodeURIComponent(folder)}`, {
    method: "GET",
  });
}

// ---- object export (compat, but fixed) ----
export const hostProfileService = {
  patchMy: updateMyHostProfile,
  getMyHostProfile,
  getHostProfilePublic,
  getCloudinarySignature, // dacă nu-l folosești încă, nu deranjează
};
