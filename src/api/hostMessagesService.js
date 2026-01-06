import { apiFetch } from "./client";

export async function sendHostMessage(payload) {
  return apiFetch("/host-messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getHostInbox({ page = 1, limit = 20, status = "all" } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (status) params.set("status", status);

  return apiFetch(`/host-messages/inbox?${params.toString()}`, { method: "GET" });
}

export async function markHostMessageRead(id) {
  return apiFetch(`/host-messages/${id}/read`, { method: "PATCH" });
}

export async function getUnreadCount() {
    return apiFetch("/host-messages/unread-count", { method: "GET" });
  }
  