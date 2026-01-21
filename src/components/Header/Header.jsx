import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { Heart, ChevronRight } from "lucide-react";
import { useFavoritesPreview } from "../../hooks/useFavoritesPreview";
import { useFavoritesStore } from "../../stores/favoritesStore";


import "./Header.css";

export default function Header() {
  const rootRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuthStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const [transparent, setTransparent] = useState(location.pathname === "/");

  const { items: favPreview, loading: favLoading, load: loadFavPreview } = useFavoritesPreview();

  const ensurePreview = useFavoritesStore((s) => s.ensurePreview);
  const preview = useFavoritesStore((s) => s.preview);
  const previewLoading = useFavoritesStore((s) => s.previewLoading);
  const setFavEnabled = useFavoritesStore((s) => s.setEnabled);
  
  // sincronizează enabled cu auth
  useEffect(() => {
    setFavEnabled(!!isAuthenticated);
  }, [isAuthenticated, setFavEnabled]);
  
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
  const dashboardLabel = isAdmin ? "Dashboard" : "Dashboard";
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
          {dashboardPath && (
                  <Link
                    to={dashboardPath}
                    className="nav-link"
                    onClick={() => {
                      setMobileOpen(false);
                      setUserOpen(false);
                    }}
                  >
                    {dashboardLabel}
                  </Link>
                )}
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
               

                <div className="user-menu">
                <button
  className="avatar-btn"
  onClick={() =>
    setUserOpen((v) => {
      const next = !v;
      if (next) ensurePreview(6);
      return next;
    })
  }
  aria-label="User menu"
>
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
                   <div className="ud-section">
  <div className="ud-title">
    <Heart size={16} />
    Favorite
  </div>

  {previewLoading ? (
    <div className="ud-skeleton">
      <div className="ud-skel-row" />
      <div className="ud-skel-row" />
      <div className="ud-skel-row" />
    </div>
  ) : preview?.length ? (
    <>
      <div className="ud-fav-list">
        {preview.slice(0, 6).map((p) => (
          <Link
            key={p.id}
            to={`/cazari/${p.id}`}
            className="ud-fav-item"
            onClick={() => setUserOpen(false)}
            title={p.title}
          >
            <div
              className="ud-fav-thumb"
              style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}
            />
            <div className="ud-fav-meta">
              <div className="ud-fav-name">{p.title}</div>
              <div className="ud-fav-sub">
                {(p.location || p.city || "Bucovina") +
                  (typeof p.pricePerNight === "number"
                    ? ` • ${p.pricePerNight} ${p.currency || "RON"}/noapte`
                    : "")}
              </div>
            </div>
            <ChevronRight size={16} className="ud-fav-arrow" />
          </Link>
        ))}
      </div>

      <Link to="/favorites" className="ud-fav-all" onClick={() => setUserOpen(false)}>
        Vezi toate favoritele
        <ChevronRight size={16} />
      </Link>
    </>
  ) : (
    <div className="ud-empty">N-ai favorite încă. Apasă ❤️ la o cazare ca să o salvezi.</div>
  )}
</div>

<div className="ud-divider" />



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
