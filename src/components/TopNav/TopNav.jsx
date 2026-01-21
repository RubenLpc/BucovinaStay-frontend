import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TopNav.css";
import { useAuthStore } from "../../stores/authStore";
import { Menu, X, Bell } from "lucide-react";

import HostNotifications from "../HostNotifications/HostNotifications";
import HostInboxModal from "../HostInboxModal/HostInboxModal";

import {
  getHostUnreadCount,
  markHostMessageRead,
} from "../../api/hostMessagesService";

function formatPlan(plan) {
  if (!plan) return "Free";
  return String(plan).charAt(0).toUpperCase() + String(plan).slice(1);
}

function formatSubStatus(s) {
  if (!s) return { label: "Inactiv", tone: "muted" };
  if (s === "active") return { label: "Activ", tone: "good" };
  if (s === "past_due") return { label: "Întârziat", tone: "warn" };
  if (s === "trial") return { label: "Trial", tone: "good" };
  return { label: s, tone: "muted" };
}

const TABS = [
  { label: "Panou", path: "/host/dashboard" },
  { label: "Activitate", path: "/host/activity" },
  { label: "Adaugă", path: "/host/add" },
  { label: "Proprietăți", path: "/host/listings" },
  { label: "Rapoarte", path: "/host/reports" },
];

export default function TopNav({
  user,
  onOpenHostProfile,
  subscription,
  onOpenSettings,
  onOpenBilling = () => {},
  onUpgrade = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  // ✅ separă stările
  const [menuOpen, setMenuOpen] = useState(false);       // dropdown cont
  const [mobileOpen, setMobileOpen] = useState(false);   // burger tabs
  const [notifOpen, setNotifOpen] = useState(false);     // drawer notificări

  // ✅ modal mesaj (HostInboxModal)
  const [activeMsg, setActiveMsg] = useState(null);

  // unread badge
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getHostUnreadCount();
        if (!alive) return;
        setUnread(res?.count ?? 0);
      } catch {}
    })();
    return () => (alive = false);
  }, []);

  // ESC close all overlays
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      setNotifOpen(false);
      setMenuOpen(false);
      setMobileOpen(false);
      setActiveMsg(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const handleOpenSettings = () => {
    if (typeof onOpenSettings === "function") return onOpenSettings();
    navigate("/host/settings");
  };

  const activeLabel = useMemo(() => {
    const hit = TABS.find((t) => location.pathname.startsWith(t.path));
    return hit?.label || "Panou";
  }, [location.pathname]);

  const displayName = user?.name || user?.email || "Host";
  const initials = (displayName || "H")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const plan = formatPlan(subscription?.plan);
  const sub = formatSubStatus(subscription?.subscriptionStatus);

  return (
    <header className="tnWrap">
      <div className="tnInner">
        <div
          className="tnBrand"
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
        >
          <div className="tnLogo" aria-hidden="true">▲</div>
          <div className="tnBrandText">BucovinaStay</div>
        </div>

        <div className="tnCenter">
          <nav className="tnPill" aria-label="Navigare host">
            {TABS.map((t) => (
              <button
                key={t.path}
                className={`tnTab ${activeLabel === t.label ? "isActive" : ""}`}
                onClick={() => navigate(t.path)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="tnRight">
          <button
            className={`tnSubPill tone-${sub.tone}`}
            type="button"
            onClick={onOpenBilling}
            title="Abonament & facturare"
          >
            <span className="tnSubPlan">{plan}</span>
            <span className="tnDotSep" aria-hidden="true" />
            <span className="tnSubStatus">{sub.label}</span>
          </button>

          {subscription?.subscriptionStatus !== "active" && (
            <button className="tnPrimaryBtn" type="button" onClick={onUpgrade}>
              Upgrade
            </button>
          )}

          {/* ✅ Bell real + badge */}
          <button
            className="tnIconBtn"
            type="button"
            aria-label="Notificări"
            aria-expanded={notifOpen}
            onClick={() => {
              setNotifOpen((v) => !v);
              setMenuOpen(false);
              setMobileOpen(false);
            }}
          >
            <Bell size={18} />
            {unread > 0 ? (
              <span className="tnBadge">{unread > 99 ? "99+" : unread}</span>
            ) : null}
          </button>

          {/* ✅ burger tabs */}
          <button
            className="tnIconBtn tnTabsBtn"
            type="button"
            aria-label="Meniu"
            onClick={() => {
              setMobileOpen((v) => !v);
              setMenuOpen(false);
              setNotifOpen(false);
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* ✅ dropdown cont separat */}
          <div className="tnProfile">
            <button
              className="tnAvatarBtn"
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v);
                setNotifOpen(false);
                setMobileOpen(false);
              }}
              aria-label="Meniu cont"
            >
              <span className="tnAvatar">{initials}</span>
            </button>

            {menuOpen && (
              <>
                <button
                  className="tnBackdrop"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Închide"
                  type="button"
                />
                <div className="tnMenu" role="menu">
                  <div className="tnMenuHead">
                    <div className="tnMenuName">{displayName}</div>
                    <div className="tnMenuMeta">
                      {plan} • {sub.label}
                    </div>
                  </div>

                  <div className="tnMenuList">
                    {TABS.map((t) => (
                      <button
                        key={t.path}
                        className={`tnMenuItem ${location.pathname.startsWith(t.path) ? "isActive" : ""}`}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(t.path);
                        }}
                      >
                        {t.label}
                        <span className="tnMenuArrow">›</span>
                      </button>
                    ))}
                  </div>

                  <div className="tnMenuSep" />

                  <button
                    className="tnMenuItem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenBilling();
                    }}
                  >
                    Abonament & facturare
                  </button>

                  <button
                    className="tnMenuItem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleOpenSettings();
                    }}
                  >
                    Setări
                  </button>

                  <button
                    className="tnMenuItem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenHostProfile?.();
                    }}
                    title="Editează profilul de gazdă"
                  >
                    Profil gazdă
                  </button>

                  <div className="tnMenuSep" />

                  <button
                    className="tnMenuItem danger"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate("/");
                    }}
                  >
                    Deconectare
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Notifications drawer/panel */}
      <HostNotifications
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onOpenInbox={() => {
          setNotifOpen(false);
          navigate("/host/dashboard"); // sau /host/inbox dacă ai pagină
        }}
        onOpenMessage={async (msg) => {
          // 1) închide notifications
          setNotifOpen(false);

          // 2) deschide modal
          setActiveMsg(msg);

          // 3) opțional: marchează read imediat + scade badge
          const id = msg?._id || msg?.id;
          if (id && (msg.status || "new") === "new") {
            try {
              await markHostMessageRead(id);
              setUnread((u) => Math.max(0, (u || 0) - 1));
            } catch {}
          }
        }}
        onOpenProperty={(propertyId) => {
          setNotifOpen(false);
          if (propertyId) navigate(`/cazari/${propertyId}`);
        }}
      />

      {/* ✅ Modal mesaj deschis din notificări */}
      <HostInboxModal
        open={!!activeMsg}
        msg={activeMsg}
        onClose={() => setActiveMsg(null)}
        onMarkRead={async () => {
          if (!activeMsg) return;
          const id = activeMsg._id || activeMsg.id;
          await markHostMessageRead(id);
          setActiveMsg((p) => (p ? { ...p, status: "read" } : p));
          setUnread((u) => Math.max(0, (u || 0) - 1));
        }}
        // dacă ai endpoint de unread:
        // onMarkUnread={...}
      />
    </header>
  );
}
