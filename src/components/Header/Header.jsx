import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, User, LogOut } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

import "./Header.css";

export default function Header() {
  const rootRef = useRef(null);
  const location = useLocation();

  const { user, isAuthenticated, logout } = useAuthStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // ✅ Transparent doar pe home, până la 60px scroll
  const [transparent, setTransparent] = useState(location.pathname === "/");

  useEffect(() => {
    const isHome = location.pathname === "/";

    // pe orice pagină diferită de home -> mereu glass
    if (!isHome) {
      setTransparent(false);
      return;
    }

    // pe home -> depinde de scroll
    const onScroll = () => setTransparent(window.scrollY < 60);
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  /* close on outside click + ESC */
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

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
              <div className="user-menu">
                <button className="avatar-btn" onClick={() => setUserOpen((v) => !v)}>
                  {initials}
                </button>

                <div className={`user-dropdown ${userOpen ? "open" : ""}`}>
                  <Link to="/profile" onClick={() => setUserOpen(false)}>
                    <User size={16} />
                    Profil
                  </Link>

                  <button
                    className="danger"
                    onClick={() => {
                      logout();
                      setUserOpen(false);
                    }}
                  >
                    <LogOut size={16} />
                    Deconectare
                  </button>
                </div>
              </div>
            )}

            {/* MOBILE BUTTON */}
            <button className="menu-toggle" onClick={() => setMobileOpen((v) => !v)}>
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
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
