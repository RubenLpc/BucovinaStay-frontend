import React, { useEffect, useMemo, useState } from "react";
import "./HostNotifications.css";
import { X, Mail, Home, ShieldCheck, AlertTriangle, RefreshCw, CheckCheck, Bell } from "lucide-react";
import { getHostInbox, markHostMessageRead, markHostMessagesReadAll } from "../../api/hostMessagesService";
import { getMyHostActivity } from "../../api/hostActivityService";
import { useSettingsStore } from "../../stores/settingsStore";
import { toast } from "sonner";

const ONE_DAY = 86400000;

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

export default function HostNotifications({ open, onClose, onOpenMessage, onOpenProperty }) {
  const { notifications: notifPrefs } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("unread");
  const [items, setItems] = useState([]);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [inboxRes, activityRes] = await Promise.all([
        getHostInbox({ limit: 12 }),
        getMyHostActivity({ range: "30d", type: "all", limit: 24 }),
      ]);

      const msgNotifs = (inboxRes?.items || []).map((m) => ({
        id: String(m._id || m.id),
        kind: "message",
        status: m.status || "new",
        createdAt: m.createdAt,
        title: m.guestName || m.fromName || "Client",
        body: String(m.message || "").slice(0, 120),
        raw: m,
      }));

      const activity = (activityRes?.items || []).filter((e) =>
        String(e.type || "").startsWith("property_")
      );

      const propNotifs = activity.map((e) => {
        const type = String(e.type);
        const isOk = type === "property_published" || type === "property_resumed" || type === "property_approved";
        const isBad = type === "property_rejected";
        const isRecent = e.createdAt && Date.now() - new Date(e.createdAt).getTime() < ONE_DAY;

        return {
          id: String(e._id || e.id),
          kind: "property",
          status: isRecent ? "new" : "read",
          createdAt: e.createdAt,
          title: e.propertyTitle || "Proprietate",
          body: isBad
            ? `Respins: ${e?.meta?.reason || "vezi detalii"}`
            : isOk
            ? "Publicată / activă"
            : type.replace("property_", "").replaceAll("_", " "),
          propertyId: e.propertyId || null,
          raw: e,
          tone: isBad ? "bad" : isOk ? "good" : "muted",
        };
      });

      const merged = [...msgNotifs, ...propNotifs].sort((a, b) => {
        const aNew = a.status === "new" ? 0 : 1;
        const bNew = b.status === "new" ? 0 : 1;
        if (aNew !== bNew) return aNew - bNew;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      setItems(merged);
    } catch {
      if (!silent) toast.error("Nu am putut încărca notificările");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // încarcă la deschidere
  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // polling la 30s când panoul e deschis
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const shown = useMemo(() => {
    let list = items.filter((x) => {
      if (x.kind === "message"  && !notifPrefs.messages)      return false;
      if (x.kind === "property" && !notifPrefs.listingStatus) return false;
      return true;
    });
    if (tab === "unread") return list.filter((x) => x.status === "new");
    return list;
  }, [items, tab, notifPrefs]);

  const unreadCount = useMemo(
    () => items.filter((x) => x.status === "new").length,
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

  async function onMarkAllRead() {
    if (unreadCount <= 0) return;
    try {
      setBusy(true);
      await markHostMessagesReadAll();
      setItems((prev) => (prev || []).map((x) => ({ ...x, status: "read" })));
      toast.success("Toate notificările au fost marcate ca citite");
    } catch (e) {
      toast.error("Nu am putut marca toate ca citite", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="hnRoot" role="dialog" aria-modal="true">
      <button className="hnBackdrop" onClick={onClose} aria-label="Închide" />

      <aside className="hnPanel">
        <div className="hnTop">
          <div className="hnTitle">Notificări</div>
          <button className="hnClose" onClick={onClose} aria-label="Închide" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="hnTabs">
          <button
            className={`hnTab ${tab === "unread" ? "isActive" : ""}`}
            onClick={() => setTab("unread")}
            type="button"
          >
            Necitite
            {unreadCount > 0 && (
              <span className="hnTabBadge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </button>
          <button
            className={`hnTab ${tab === "all" ? "isActive" : ""}`}
            onClick={() => setTab("all")}
            type="button"
          >
            Toate
          </button>

          <div className="hnSpacer" />

          <button className="hnChipBtn" type="button" disabled={busy} onClick={onRefresh} title="Actualizează">
            <RefreshCw size={15} />
          </button>
          <button className="hnChipBtn" type="button" disabled={busy || unreadCount <= 0} onClick={onMarkAllRead} title="Marchează toate ca citite">
            <CheckCheck size={15} />
          </button>
        </div>

        <div className="hnList">
          {loading && <div className="hnEmpty">Se încarcă…</div>}

          {!loading && shown.length === 0 && (
            <div className="hnEmpty hnEmptyCentered">
              <div className="hnEmptyIcon"><Bell size={26} /></div>
              <div className="hnEmptyTitle">
                {tab === "unread" ? "Nicio notificare necitită" : "Nicio notificare"}
              </div>
              <div className="hnEmptySub">Mesaje noi și statusul proprietăților.</div>
            </div>
          )}

          {!loading && shown.map((n) => {
            const isNew = n.status === "new";
            const Icon =
              n.kind === "message" ? Mail
              : n.tone === "good" ? ShieldCheck
              : n.tone === "bad" ? AlertTriangle
              : Home;

            const iconMod =
              n.kind === "message" ? "hnIcon--msg"
              : n.tone === "good" ? "hnIcon--good"
              : n.tone === "bad" ? "hnIcon--bad"
              : "";

            return (
              <button
                key={n.id}
                type="button"
                className={`hnItem${isNew ? " isNew" : ""}`}
                onClick={async () => {
                  if (n.kind === "message") {
                    if (isNew) {
                      try {
                        await markHostMessageRead(n.id);
                        setItems((prev) =>
                          prev.map((x) =>
                            x.kind === "message" && x.id === n.id ? { ...x, status: "read" } : x
                          )
                        );
                      } catch { /* silent */ }
                    }
                    onOpenMessage?.(n.raw);
                    return;
                  }
                  if (n.kind === "property" && n.propertyId) {
                    setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, status: "read" } : x));
                    onOpenProperty?.(n.propertyId);
                  }
                }}
              >
                <div className={`hnIcon ${iconMod}`}>
                  <Icon size={17} />
                </div>

                <div className="hnBody">
                  <div className="hnRow">
                    <div className="hnItemTitle">{n.title}</div>
                    <div className="hnTime">{timeAgo(n.createdAt)}</div>
                  </div>
                  <div className="hnText">{n.body}</div>
                  {isNew && <div className="hnBadge">NOU</div>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
