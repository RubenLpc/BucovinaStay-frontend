import { apiFetch } from "./client";

// GET list
export function getAdminNotifications(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  const q = qs.toString();
  return apiFetch(`/notifications/admin${q ? `?${q}` : ""}`);
}

// GET unread count
export function getAdminUnreadCount() {
  return apiFetch(`/notifications/admin/unread-count`);
}

// PATCH mark one read/unread
export function markAdminNotificationRead(id) {
  return apiFetch(`/notifications/admin/${id}/read`, { method: "PATCH" });
}
export function markAdminNotificationUnread(id) {
  return apiFetch(`/notifications/admin/${id}/unread`, { method: "PATCH" });
}

// PATCH mark all read
export function markAdminNotificationsReadAll() {
  return apiFetch(`/notifications/admin/read-all`, { method: "PATCH" });
}
