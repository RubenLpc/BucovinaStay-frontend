// client/src/components/HostNotifications/HostNotifications.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./HostNotifications.css";
import { X, Mail, Home, ShieldCheck, AlertTriangle, RefreshCw, CheckCheck,Bell } from "lucide-react";
import { getHostInbox, markHostMessageRead, markHostMessagesReadAll } from "../../api/hostMessagesService";
import { getMyHostActivity } from "../../api/hostActivityService";
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

export default function HostNotifications({
  open,
  onClose,
  onOpenInbox,
  onOpenMessage,   // (rawMessage) => void (deschide HostInboxModal)
  onOpenProperty,  // (propertyId) => void (navigate)
}) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false); // pentru butoane (refresh / mark all)
  const [tab, setTab] = useState("unread"); // unread | all
  const [items, setItems] = useState([]); // merged list (messages + property events)

  async function load() {
    setLoading(true);
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
        const isOk = type === "property_published" || type === "property_resumed";
        const isBad = type === "property_rejected";

        return {
          id: String(e._id || e.id),
          kind: "property",
          status: "read", // până avem read/unread la activity events
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
        const aNew = (a.status || "new") === "new" ? 0 : 1;
        const bNew = (b.status || "new") === "new" ? 0 : 1;
        if (aNew !== bNew) return aNew - bNew;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      setItems(merged);
    } catch (e) {
      toast.error("Nu am putut încărca notificările", {
        description: e?.message || "Încearcă din nou.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    if (!open) return;

    (async () => {
      if (!alive) return;
      await load();
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shown = useMemo(() => {
    if (tab === "unread") return items.filter((x) => (x.status || "new") === "new");
    return items;
  }, [items, tab]);

  const unreadCount = useMemo(() => {
    return items.filter((x) => x.kind === "message" && (x.status || "new") === "new").length;
  }, [items]);

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
      // local update: marchează doar message notifs ca read
      setItems((prev) =>
        (prev || []).map((x) =>
          x.kind === "message" ? { ...x, status: "read" } : x
        )
      );
      toast.success("Toate mesajele au fost marcate ca citite");
    } catch (e) {
      toast.error("Nu am putut marca toate ca citite", {
        description: e?.message || "Încearcă din nou.",
      });
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
          <button
            className="hnClose"
            onClick={onClose}
            aria-label="Închide"
            type="button"
          >
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
            {unreadCount > 0 ? <span className="hnTabBadge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
          </button>

          <button
            className={`hnTab ${tab === "all" ? "isActive" : ""}`}
            onClick={() => setTab("all")}
            type="button"
          >
            Toate
          </button>

          <div className="hnSpacer" />

          <button className="hnChipBtn" type="button" disabled={busy} onClick={onRefresh}>
            <RefreshCw size={16} />
            
          </button>

          <button className="hnChipBtn" type="button" disabled={busy || unreadCount <= 0} onClick={onMarkAllRead}>
            <CheckCheck size={16} />
           
          </button>

          
        </div>

        <div className="hnList">
          {loading ? <div className="hnEmpty">Se încarcă…</div> : null}

          {!loading && shown.length === 0 ? (
            <div className="hnEmpty hnEmptyCentered">
              <div className="hnEmptyIcon"><Bell size={26} /></div>
              <div className="hnEmptyTitle">
                Nu ai notificări {tab === "unread" ? "necitite" : ""}
              </div>
              <div className="hnEmptySub">Mesaje noi și statusul proprietăților.</div>
            </div>
          ) : null}

          {!loading &&
            shown.map((n) => {
              const isNew = (n.status || "new") === "new";

              const Icon =
                n.kind === "message"
                  ? Mail
                  : n.tone === "good"
                  ? ShieldCheck
                  : n.tone === "bad"
                  ? AlertTriangle
                  : Home;

              return (
                <button
                  key={n.id}
                  type="button"
                  className={`hnItem ${isNew ? "isNew" : ""}`}
                  onClick={async () => {
                    // click message => open modal + auto mark read
                    if (n.kind === "message") {
                      const raw = n.raw;

                      if (isNew) {
                        try {
                          await markHostMessageRead(n.id);
                          setItems((prev) =>
                            (prev || []).map((x) =>
                              x.kind === "message" && String(x.id) === String(n.id)
                                ? { ...x, status: "read" }
                                : x
                            )
                          );
                        } catch {
                          // silent (nu stric UX)
                        }
                      }

                      onOpenMessage?.(raw);
                      return;
                    }

                    // click property => go to property
                    if (n.kind === "property" && n.propertyId) {
                      onOpenProperty?.(n.propertyId);
                    }
                  }}
                >
                  <div className="hnIcon">
                    <Icon size={18} />
                  </div>

                  <div className="hnBody">
                    <div className="hnRow">
                      <div className="hnItemTitle">{n.title}</div>
                      <div className="hnTime">{timeAgo(n.createdAt)}</div>
                    </div>

                    <div className="hnText">{n.body}</div>

                    {isNew ? <div className="hnBadge">NOU</div> : null}
                  </div>
                </button>
              );
            })}
        </div>
      </aside>
    </div>
  );
}
