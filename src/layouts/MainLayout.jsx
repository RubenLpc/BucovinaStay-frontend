import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import Chatbot from "../components/Chatbot/Chatbot";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { authService } from "../api/authService";
import { onMaintenance } from "../api/client";
import { useSettingsStore } from "../stores/settingsStore";
import { useState } from "react";

const SITE_THEME_KEY = "site-theme";

export default function MainLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === "/" || pathname === "/trasee";
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(SITE_THEME_KEY) || "light";
  });

  // global maintenance redirect
  useEffect(() => {
    return onMaintenance((payload) => {
      navigate("/maintenance", { replace: true, state: payload || null });
    });
  }, [navigate]);

  // session bootstrap + load settings for host/admin
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authService.getMe()
        .then((u) => {
          if (u?.role === "host" || u?.role === "admin") {
            useSettingsStore.getState().load();
          }
        })
        .catch(() => localStorage.removeItem("token"));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SITE_THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="siteShell" data-site-theme={theme}>
      <Header theme={theme} onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} />
      <main className={`app-main ${isHome ? "noOffset" : "withOffset"}`}>
        <Outlet />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}
