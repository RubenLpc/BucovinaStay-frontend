import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

import "./Header.css";

export default function Header() {
  const rootRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuthStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const [transparent, setTransparent] = useState(location.pathname === "/");

  useEffect(() => {
    const isHome = location.pathname === "/";
    if (!isHome) {
      setTransparent(false);
      return;
    }
    const onScroll = () => setTransparent(window.scrollY < 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setMobileOpen(false);
        setUserOpen(false);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setUserOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const isHost = user?.role === "host";
  const isAdmin = user?.role === "admin";

  const dashboardPath = isAdmin ? "/admin" : isHost ? "/host" : null;
  const dashboardLabel = isAdmin ? "Admin" : "Dashboard";
  const DashboardIcon = isAdmin ? Shield : LayoutDashboard;

  return (
    <header className={`site-header theme-light ${transparent ? "is-transparent" : ""}`}>
      <div className="header-bar">
        <div className="container header-inner" ref={rootRef}>
          {/* BRAND */}
          <Link to="/" className="brand">
            <span className="brand-main">Bucovina</span>
            <span className="brand-accent">Stay</span>
          </Link>

          {/* NAV DESKTOP */}
          <nav className="header-nav">
            <NavLink to="/" className="nav-link">
              Acasă
            </NavLink>
            <NavLink to="/cazari" className="nav-link">
              Cazări
            </NavLink>
          </nav>

          {/* ACTIONS */}
          <div className="header-actions">
            {!isAuthenticated ? (
              <Link to="/auth/login" className="btn btn-primary">
                Autentificare
              </Link>
            ) : (
              <>
                {/* ✅ DASHBOARD shortcut (desktop) */}
                {dashboardPath && (
                  <Link
                    to={dashboardPath}
                    className="btn btn-ghost"
                    onClick={() => {
                      setMobileOpen(false);
                      setUserOpen(false);
                    }}
                  >
                    <DashboardIcon size={16} />
                    {dashboardLabel}
                  </Link>
                )}

                <div className="user-menu">
                  <button className="avatar-btn" onClick={() => setUserOpen((v) => !v)} aria-label="User menu">
                    {initials}
                  </button>

                  <div className={`user-dropdown ${userOpen ? "open" : ""}`}>
                    {/* ✅ Dashboard și în dropdown (mai ales util pe mobil/compact) */}
                    {dashboardPath && (
                      <Link
                        to={dashboardPath}
                        onClick={() => setUserOpen(false)}
                      >
                        <DashboardIcon size={16} />
                        {dashboardLabel}
                      </Link>
                    )}

                    <Link to="/profile" onClick={() => setUserOpen(false)}>
                      <User size={16} />
                      Profil
                    </Link>

                    <button
                      className="danger"
                      onClick={() => {
                        logout();
                        setUserOpen(false);
                        navigate("/");
                      }}
                    >
                      <LogOut size={16} />
                      Deconectare
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* MOBILE BUTTON */}
            <button className="menu-toggle" onClick={() => setMobileOpen((v) => !v)} aria-label="Open menu">
              <Menu size={20} />
            </button>

            {/* MOBILE MENU */}
            <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
              <NavLink to="/" onClick={() => setMobileOpen(false)}>
                Acasă
              </NavLink>
              <NavLink to="/cazari" onClick={() => setMobileOpen(false)}>
                Cazări
              </NavLink>

              {/* ✅ Dashboard și în mobile menu */}
              {isAuthenticated && dashboardPath && (
                <NavLink to={dashboardPath} onClick={() => setMobileOpen(false)}>
                  {dashboardLabel}
                </NavLink>
              )}

              {!isAuthenticated && (
                <NavLink to="/auth/login" onClick={() => setMobileOpen(false)}>
                  Autentificare
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
