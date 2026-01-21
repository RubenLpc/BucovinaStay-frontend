import React, { useEffect, useMemo, useState } from "react";
import "./AdminNotifications.css";
import {
  X,
  Bell,
  ShieldCheck,
  AlertTriangle,
  Home,
  Users,
  Star,
  RefreshCw,
  CheckCheck,
} from "lucide-react";
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
  if (n.type?.includes("published")) return ShieldCheck;
  if (n.entityType === "property") return Home;
  if (n.entityType === "user") return Users;
  if (n.entityType === "review") return Star;
  return Bell;
}

export default function AdminNotifications({
  open,
  onClose,
  onNavigateEntity, // (n) => navigate(...)
  onUnreadChange,   // (count) => set badge
}) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("new"); // new | all
  const [items, setItems] = useState([]);

  async function load() {
    try {
      setLoading(true);
      const res = await getAdminNotifications({
        status: tab === "new" ? "new" : "all",
        limit: 20,
        page: 1,
      });
      setItems(res?.items || []);
      onUnreadChange?.(
        tab === "new" ? (res?.items?.length || 0) : undefined
      );
    } catch (e) {
      toast.error("Nu am putut încărca notificările");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const hasItems = items && items.length > 0;

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
          <button
            className={`anTab ${tab === "new" ? "isActive" : ""}`}
            type="button"
            onClick={() => setTab("new")}
          >
            Necitite
          </button>
          <button
            className={`anTab ${tab === "all" ? "isActive" : ""}`}
            type="button"
            onClick={() => setTab("all")}
          >
            Toate
          </button>

          <div className="anSpacer" />

          <button
            className="anIconAction"
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button
            className="anIconAction"
            type="button"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                await markAdminNotificationsReadAll();
                toast.success("Gata", { description: "Toate notificările au fost marcate ca citite." });
                setItems((prev) => (prev || []).map((x) => ({ ...x, status: "read" })));
                // dacă ești pe necitite -> golește
                if (tab === "new") setItems([]);
                onUnreadChange?.(0);
              } catch {
                toast.error("Nu am putut marca toate ca citite");
              } finally {
                setLoading(false);
              }
            }}
            title="Mark all read"
          >
            <CheckCheck size={16} />
          </button>
        </div>

        <div className="anList">
          {loading && !hasItems ? <div className="anEmpty">Se încarcă…</div> : null}

          {!loading && !hasItems ? (
            <div className="anEmpty anEmptyCenter">
              <div className="anEmptyIcon"><Bell size={26} /></div>
              <div className="anEmptyTitle">
                {tab === "new" ? "Nicio notificare necitită" : "Nicio notificare"}
              </div>
              <div className="anEmptySub">
                Aici apar listing-uri noi la review, respingeri, raportări etc.
              </div>
            </div>
          ) : null}

          {hasItems &&
            items.map((n) => {
              const isNew = (n.status || "new") === "new";
              const Icon = pickIcon(n);
              const when = timeAgo(n.createdAt);

              return (
                <button
                  key={String(n._id || n.id)}
                  type="button"
                  className={`anItem ${isNew ? "isNew" : ""}`}
                  onClick={async () => {
                    const id = n._id || n.id;

                    // mark read (optimistic)
                    if (isNew) {
                      setItems((prev) =>
                        (prev || []).map((x) =>
                          String(x._id || x.id) === String(id)
                            ? { ...x, status: "read" }
                            : x
                        )
                      );
                      try {
                        await markAdminNotificationRead(id);
                      } catch {
                        // revert dacă vrei; eu las așa (UX > perfecțiune)
                      }
                    }

                    // navigate to entity
                    onNavigateEntity?.(n);
                    onClose?.();
                  }}
                >
                  <div className="anIcon">
                    <Icon size={18} />
                  </div>

                  <div className="anBody">
                    <div className="anRow">
                      <div className="anItemTitle">{n.title}</div>
                      <div className="anTime">{when}</div>
                    </div>
                    {n.body ? <div className="anText">{n.body}</div> : null}
                    {isNew ? <div className="anBadge">NOU</div> : null}
                  </div>
                </button>
              );
            })}
        </div>
      </aside>
    </div>
  );
}
