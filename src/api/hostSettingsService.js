import { apiFetch } from "./client";

export async function getMyHostSettings() {
  return apiFetch("/host-settings/me", { method: "GET" });
}

export async function patchMyHostSettings(patch) {
  return apiFetch("/host-settings/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export const hostSettingsService = {
  getMy: getMyHostSettings,
  patchMy: patchMyHostSettings,
};


