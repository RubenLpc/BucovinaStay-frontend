// client/src/components/AdminTopNav/AdminTopNav.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Settings,
  LayoutDashboard,
  ArrowRight,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

import "./AdminTopNav.css";
import { useAuthStore } from "../../stores/authStore";

const ADMIN_TABS = [
  { label: "Overview", path: "/admin" },
  { label: "Users", path: "/admin/users" },
  { label: "Listings", path: "/admin/listings" },
  { label: "Reviews", path: "/admin/reviews" },
  { label: "Settings", path: "/admin/settings" },
];

function getActiveLabel(pathname) {
  if (pathname === "/admin") return "Overview";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/listings")) return "Listings";
  if (pathname.startsWith("/admin/reviews")) return "Reviews";
  if (pathname.startsWith("/admin/settings")) return "Settings";
  return "Overview";
}

function initialsFrom(nameOrEmail) {
  const s = (nameOrEmail || "Admin").trim();
  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export default function AdminTopNav({
  brandText = "BucovinaStay",
  roleLabel = "Admin", // ✅ rămâne mereu vizibil
  onOpenAdminProfile,
  onOpenNotifications,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const activeLabel = useMemo(
    () => getActiveLabel(location.pathname),
    [location.pathname]
  );

  const displayName = user?.name || user?.email || "Admin";
  const initials = useMemo(() => initialsFrom(displayName), [displayName]);

  // Close on ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function go(path) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <header className="atnWrap">
      <div className="atnInner atnInnerOneLine">
        {/* LEFT: BRAND */}
        <div
          className="atnBrand"
          role="button"
          tabIndex={0}
          onClick={() => go("/admin")}
          onKeyDown={(e) => e.key === "Enter" && go("/admin")}
        >
          <div className="atnLogo" aria-hidden="true">
            <LayoutDashboard size={16} />
          </div>
          <div className="atnBrandText">
            {brandText} <span className="atnBrandDim"></span>
          </div>
        </div>

        {/* CENTER: desktop tabs only */}
        <div className="atnCenter atnCenterDesktop">
          <nav className="atnPill" aria-label="Admin navigation">
            {ADMIN_TABS.map((t) => (
              <button
                key={t.path}
                type="button"
                className={`atnTab ${activeLabel === t.label ? "isActive" : ""}`}
                onClick={() => go(t.path)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* RIGHT: single line icons (mobile + desktop) */}
        <div className="atnRight">
          {/* ✅ Role pill stays in top bar */}
          <button
            className="atnRolePill"
            type="button"
            onClick={() => go("/admin")}
            title="Role"
          >
            <span className="atnRoleLbl">Role</span>
            <span className="atnDotSep" aria-hidden="true" />
            <span className="atnRoleVal">{roleLabel}</span>
          </button>

          <button
            className="atnIconBtn"
            type="button"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => (onOpenNotifications ? onOpenNotifications() : null)}
          >
            <Bell size={16} />
            <span className="atnNotifDot" aria-hidden="true" />
          </button>

          <div className="atnProfile">
            <button
              className="atnAvatarBtn"
              type="button"
              aria-label="Open admin profile"
              onClick={() => (typeof onOpenAdminProfile === "function" ? onOpenAdminProfile() : null)}
            >
              <span className="atnAvatar">{initials}</span>
            </button>
          </div>

          {/* ✅ Hamburger replaces settings on mobile */}
          <button
            className="atnIconBtn atnMenuBtn"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            title="Menu"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {menuOpen && (
            <>
              <button
                className="atnBackdrop"
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              />

              <div className="atnMenu atnMenuTabs" role="menu" aria-label="Admin menu">
                {/* TOP: role + identity */}
                <div className="atnMenuHead atnMenuHeadRole">
                  <div className="atnMenuHeadTop">
                    <div className="atnRoleChip">
                      <ShieldCheck size={14} />
                      <span>Role</span>
                      <span className="atnRoleChipDot" />
                      <b>{roleLabel}</b>
                    </div>
                  </div>

                  <div className="atnMenuName">{displayName}</div>
                  <div className="atnMenuMeta">Admin • Control Panel</div>
                </div>

                {/* NAV LIST */}
                <div className="atnMenuList" role="none">
                  {ADMIN_TABS.map((t) => (
                    <button
                      key={t.path}
                      className={`atnMenuItem ${activeLabel === t.label ? "isActive" : ""}`}
                      type="button"
                      role="menuitem"
                      onClick={() => go(t.path)}
                    >
                      <span>{t.label}</span>
                      <ArrowRight size={14} className="atnMenuArrow" />
                    </button>
                  ))}
                </div>

                <div className="atnMenuSep" />

                {/* actions */}
                <button
                  className="atnMenuItem"
                  type="button"
                  role="menuitem"
                  onClick={() => go("/")}
                >
                  <span>Go to website</span>
                  <ArrowRight size={14} className="atnMenuArrow" />
                </button>

                <button
                  className="atnMenuItem danger"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    navigate("/", { replace: true });
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
