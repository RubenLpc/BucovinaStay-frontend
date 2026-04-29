import React, { useEffect, useMemo, useState } from "react";
import "./AdminNotifications.css";
import { X, Bell, ShieldCheck, AlertTriangle, Home, Users, Star, RefreshCw, CheckCheck } from "lucide-react";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAdminNotificationsReadAll,
} from "../../api/adminNotificationsService";
import { toast } from "sonner";

function timeAgo(ts) {
  const t = ts ? new Date(ts).getTime() : 0;
  if (!t) return "";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return `${d} zile`;
}

function pickIcon(n) {
  if (n.severity === "bad") return AlertTriangle;
  if (n.type?.includes("published") || n.severity === "info") return ShieldCheck;
  if (n.entityType === "property") return Home;
  if (n.entityType === "user") return Users;
  if (n.entityType === "review") return Star;
  return Bell;
}

function pickIconMod(n) {
  if (n.severity === "bad") return "anIcon--bad";
  if (n.severity === "warn") return "anIcon--warn";
  if (n.severity === "info" || n.type?.includes("published")) return "anIcon--good";
  return "";
}

export default function AdminNotifications({ open, onClose, onNavigateEntity, onUnreadChange }) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("new");
  const [items, setItems] = useState([]);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await getAdminNotifications({ status: "all", limit: 40, page: 1 });
      const all = res?.items || [];
      setItems(all);
      const unread = all.filter((x) => (x.status || "new") === "new").length;
      onUnreadChange?.(unread);
    } catch {
      if (!silent) toast.error("Nu am putut încărca notificările");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // polling la 30s
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const shown = useMemo(() => {
    if (tab === "new") return items.filter((x) => (x.status || "new") === "new");
    return items;
  }, [items, tab]);

  const unreadCount = useMemo(
    () => items.filter((x) => (x.status || "new") === "new").length,
    [items]
  );

  async function onRefresh() {
    try {
      setBusy(true);
      await load();
      toast.success("Notificări actualizate");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkAll() {
    if (unreadCount <= 0) return;
    try {
      setBusy(true);
      await markAdminNotificationsReadAll();
      setItems((prev) => (prev || []).map((x) => ({ ...x, status: "read" })));
      onUnreadChange?.(0);
      toast.success("Toate notificările au fost marcate ca citite");
    } catch {
      toast.error("Nu am putut marca toate ca citite");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="anRoot" role="dialog" aria-modal="true">
      <button className="anBackdrop" onClick={onClose} aria-label="Închide" />

      <aside className="anPanel">
        <div className="anTop">
          <div className="anTitle">Notificări admin</div>
          <button className="anClose" onClick={onClose} aria-label="Închide" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="anTabs">
          <button className={`anTab ${tab === "new" ? "isActive" : ""}`} type="button" onClick={() => setTab("new")}>
            Necitite
            {unreadCount > 0 && (
              <span className="anTabBadge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </button>
          <button className={`anTab ${tab === "all" ? "isActive" : ""}`} type="button" onClick={() => setTab("all")}>
            Toate
          </button>

          <div className="anSpacer" />

          <button className="anIconAction" type="button" onClick={onRefresh} disabled={busy} title="Actualizează">
            <RefreshCw size={15} />
          </button>
          <button className="anIconAction" type="button" disabled={busy || unreadCount <= 0} onClick={onMarkAll} title="Marchează toate ca citite">
            <CheckCheck size={15} />
          </button>
        </div>

        <div className="anList">
          {loading && !items.length && <div className="anEmpty">Se încarcă…</div>}

          {!loading && shown.length === 0 && (
            <div className="anEmpty anEmptyCenter">
              <div className="anEmptyIcon"><Bell size={26} /></div>
              <div className="anEmptyTitle">
                {tab === "new" ? "Nicio notificare necitită" : "Nicio notificare"}
              </div>
              <div className="anEmptySub">Listing-uri noi, respingeri, raportări etc.</div>
            </div>
          )}

          {shown.map((n) => {
            const isNew = (n.status || "new") === "new";
            const Icon = pickIcon(n);
            const iconMod = pickIconMod(n);

            return (
              <button
                key={String(n._id || n.id)}
                type="button"
                className={`anItem${isNew ? " isNew" : ""}`}
                onClick={async () => {
                  if (isNew) {
                    const id = n._id || n.id;
                    setItems((prev) =>
                      prev.map((x) =>
                        String(x._id || x.id) === String(id) ? { ...x, status: "read" } : x
                      )
                    );
                    onUnreadChange?.(Math.max(0, unreadCount - 1));
                    try { await markAdminNotificationRead(id); } catch { /* silent */ }
                  }
                  onNavigateEntity?.(n);
                  onClose?.();
                }}
              >
                <div className={`anIcon ${iconMod}`}>
                  <Icon size={17} />
                </div>

                <div className="anBody">
                  <div className="anRow">
                    <div className="anItemTitle">{n.title}</div>
                    <div className="anTime">{timeAgo(n.createdAt)}</div>
                  </div>
                  {n.body && <div className="anText">{n.body}</div>}
                  {isNew && <div className="anBadge">NOU</div>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
