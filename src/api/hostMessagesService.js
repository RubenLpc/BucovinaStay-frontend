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



export async function getHostUnreadCount() {
    return apiFetch("/host-messages/unread-count", { method: "GET" });
  }
  
  export function markHostMessageRead(id) {
    return apiFetch(`/host-messages/${id}/read`, { method: "PATCH" });
  }
  
  export function markHostMessageUnread(id) {
    return apiFetch(`/host-messages/${id}/unread`, { method: "PATCH" });
  }
  
  export function markHostMessagesReadAll() {
    return apiFetch(`/host-messages/read-all`, { method: "PATCH" });
  }
  