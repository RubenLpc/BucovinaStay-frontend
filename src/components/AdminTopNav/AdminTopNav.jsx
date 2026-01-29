// client/src/components/AdminTopNav/AdminTopNav.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  ArrowRight,
  Menu,
  X,
  ShieldCheck,
  Globe,
  Check,
} from "lucide-react";

import "./AdminTopNav.css";
import { useAuthStore } from "../../stores/authStore";
import AdminNotifications from "../AdminNotifications/AdminNotifications";
import { getAdminUnreadCount } from "../../api/adminNotificationsService";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const ADMIN_TABS = [
  { key: "overview", path: "/admin" },
  { key: "users", path: "/admin/users" },
  { key: "listings", path: "/admin/listings" },
  { key: "reviews", path: "/admin/reviews" },
  { key: "settings", path: "/admin/settings" },
];

function getActiveKey(pathname) {
  if (pathname === "/admin") return "overview";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/listings")) return "listings";
  if (pathname.startsWith("/admin/reviews")) return "reviews";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return "overview";
}

function initialsFrom(nameOrEmail) {
  const s = (nameOrEmail || "Admin").trim();
  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

const LANGS = [
  { code: "ro", label: "RO", nameKey: "adminTopNav.langs.ro" },
  { code: "en", label: "EN", nameKey: "adminTopNav.langs.en" },
];

export default function AdminTopNav({
  brandText = "BucovinaStay",
  roleLabel = "Admin",
  onOpenAdminProfile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // i18n
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "ro").slice(0, 2);

  const activeKey = useMemo(() => getActiveKey(location.pathname), [location.pathname]);

  const displayName = user?.name || user?.email || "Admin";
  const initials = useMemo(() => initialsFrom(displayName), [displayName]);

  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const setLang = async (code) => {
    if (!code || code === lang) return;
    try {
      await i18n.changeLanguage(code);
      localStorage.setItem("lang", code);

      toast.success(t("adminTopNav.toasts.languageChangedTitle"), {
        description: t(
          code === "ro" ? "adminTopNav.toasts.languageChangedRO" : "adminTopNav.toasts.languageChangedEN"
        ),
      });
    } catch (e) {
      toast.error(t("adminTopNav.toasts.languageFailedTitle"), {
        description: t("adminTopNav.toasts.languageFailedDesc"),
      });
    }
  };

  // unread count
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getAdminUnreadCount();
        if (!alive) return;
        setUnread(res?.count ?? 0);
      } catch {}
    })();
    return () => (alive = false);
  }, []);

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
          onClick={() => go("/")}
          onKeyDown={(e) => e.key === "Enter" && go("/admin")}
          aria-label={t("adminTopNav.aria.brand")}
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
          <nav className="atnPill" aria-label={t("adminTopNav.aria.nav")}>
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`atnTab ${activeKey === tab.key ? "isActive" : ""}`}
                onClick={() => go(tab.path)}
              >
                {t(`adminTopNav.tabs.${tab.key}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* RIGHT: actions */}
        <div className="atnRight">
          {/* Role pill */}
          <button
            className="atnRolePill"
            type="button"
            onClick={() => go("/admin")}
            title={t("adminTopNav.role")}
            aria-label={t("adminTopNav.role")}
          >
            <span className="atnRoleLbl">{t("adminTopNav.role")}</span>
            <span className="atnDotSep" aria-hidden="true" />
            <span className="atnRoleVal">{roleLabel}</span>
          </button>

          {/* Desktop language switcher (hidden on mobile via CSS) */}
          <div className="atnLangDesktop" aria-label={t("adminTopNav.language")}>
            <button
              className="atnLangBtn"
              type="button"
              onClick={() => setLang(lang === "ro" ? "en" : "ro")}
              title={lang === "ro" ? t("adminTopNav.switchToEN") : t("adminTopNav.switchToRO")}
              aria-label={t("adminTopNav.language")}
            >
              <Globe size={16} />
              <span className="atnLangCode">{lang === "ro" ? "RO" : "EN"}</span>
            </button>
          </div>

          {/* Notifications */}
          <button
            className="atnIconBtn"
            type="button"
            aria-label={t("adminTopNav.notifications")}
            title={t("adminTopNav.notifications")}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell size={16} />
            {unread > 0 ? <span className="atnBadge">{unread > 99 ? "99+" : unread}</span> : null}
          </button>

          {/* Avatar */}
          <div className="atnProfile">
            <button
              className="atnAvatarBtn"
              type="button"
              aria-label={t("adminTopNav.openAdminProfile")}
              onClick={() => (typeof onOpenAdminProfile === "function" ? onOpenAdminProfile() : null)}
            >
              <span className="atnAvatar">{initials}</span>
            </button>
          </div>

          {/* Hamburger */}
          <button
            className="atnIconBtn atnMenuBtn"
            type="button"
            aria-label={menuOpen ? t("adminTopNav.closeMenu") : t("adminTopNav.openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            title={t("adminTopNav.menu")}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {menuOpen && (
            <>
              <button
                className="atnBackdrop"
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={t("adminTopNav.closeMenu")}
              />

              <div className="atnMenu atnMenuTabs" role="menu" aria-label={t("adminTopNav.aria.menu")}>
                {/* TOP: role + identity */}
                <div className="atnMenuHead atnMenuHeadRole">
                  <div className="atnMenuHeadTop">
                    <div className="atnRoleChip">
                      <ShieldCheck size={14} />
                      <span>{t("adminTopNav.role")}</span>
                      <span className="atnRoleChipDot" />
                      <b>{roleLabel}</b>
                    </div>
                  </div>

                  <div className="atnMenuName">{displayName}</div>
                  <div className="atnMenuMeta">{t("adminTopNav.adminMeta")}</div>
                </div>

                {/* Mobile language picker (ONLY in menu) */}
                <div className="atnLangMobile" aria-label={t("adminTopNav.language")}>
            <button
              className="atnLangBtn"
              type="button"
              onClick={() => setLang(lang === "ro" ? "en" : "ro")}
              title={lang === "ro" ? t("adminTopNav.switchToEN") : t("adminTopNav.switchToRO")}
              aria-label={t("adminTopNav.language")}
            >
              <Globe size={16} />
              <span className="atnLangCode">{lang === "ro" ? "RO" : "EN"}</span>
            </button>
          </div>

                <div className="atnMenuSep" />

                {/* NAV LIST */}
                <div className="atnMenuList" role="none">
                  {ADMIN_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      className={`atnMenuItem ${activeKey === tab.key ? "isActive" : ""}`}
                      type="button"
                      role="menuitem"
                      onClick={() => go(tab.path)}
                    >
                      <span>{t(`adminTopNav.tabs.${tab.key}`)}</span>
                      <ArrowRight size={14} className="atnMenuArrow" />
                    </button>
                  ))}
                </div>

                <div className="atnMenuSep" />

                {/* actions */}
                <button className="atnMenuItem" type="button" role="menuitem" onClick={() => go("/")}>
                  <span>{t("adminTopNav.goToWebsite")}</span>
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
                  {t("adminTopNav.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <AdminNotifications
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadChange={(c) => {
          if (typeof c === "number") setUnread(c);
        }}
        onNavigateEntity={(n) => {
          if (n?.entityType === "property" && n?.entityId) {
            navigate(`/cazari/${n.entityId}`);
            return;
          }
          toast.info(t("adminTopNav.notificationFallbackTitle"), { description: n?.title || "—" });
        }}
      />
    </header>
  );
}
