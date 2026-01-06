// client/src/components/TopNav/TopNav.jsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TopNav.css";
import { User } from "lucide-react";


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
  onOpenSettings = () => {},
  onOpenBilling = () => {},
  onUpgrade = () => {},
  onLogout = () => {},
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
          <div className="tnLogo" aria-hidden="true">
            ▲
          </div>
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

          <button className="tnIconBtn" type="button" aria-label="Notificări">
            <span className="tnNotifDot" /> 🔔
          </button>

          <button
            className="tnIconBtn"
            type="button"
            aria-label="Setări"
            onClick={onOpenSettings}
          >
            ⚙️
          </button>

          <div className="tnProfile">
            <button
              className="tnAvatarBtn"
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Meniu cont"
            >
              <span className="tnAvatar">{initials}</span>
            </button>

            {open && (
              <>
                <button
                  className="tnBackdrop"
                  onClick={() => setOpen(false)}
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

                  <button
                    className="tnMenuItem"
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenBilling();
                    }}
                  >
                    Abonament & facturare
                  </button>
                  <button
                    className="tnMenuItem"
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenSettings();
                    }}
                  >
                    Setări
                  </button>

                  <button
                    className="tnMenuItem"
                    type="button"
                    onClick={() => {
                      setOpen(false);
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
                      setOpen(false);
                      onLogout();
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
    </header>
  );
}
