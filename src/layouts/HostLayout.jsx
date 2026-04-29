// client/src/layouts/HostLayout.jsx
import { Outlet } from "react-router-dom";
import TopNav from "../components/TopNav/TopNav";
import { useAuthStore } from "../stores/authStore";
import HostProfileModal from "../components/HostProfileModal/HostProfileModal";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { onMaintenance } from "../api/client";

import { useState } from "react";

const HOST_THEME_KEY = "host-theme";

export default function HostLayout() {
  const { user, logout } = useAuthStore();
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  const navigate = useNavigate();
  const [mt, setMt] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(HOST_THEME_KEY) || "light";
  });

  useEffect(() => {
    return onMaintenance((payload) => {
      setMt(payload || { message: "Maintenance" });
      navigate("/maintenance", { replace: true, state: payload || null });
    });
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HOST_THEME_KEY, theme);
  }, [theme]);
  // până legi abonamentul real, poți ține un stub aici
  const subscription = {
    plan: "free",
    subscriptionStatus: "inactive",
    nextBillingDate: null,
  };

  function handleOpenSettings() {
    navigate("/host/settings");
    
    // deschizi pagină/modal
    console.log("settings");
  }
  function handleOpenBilling() {
    console.log("billing");
  }
  function handleUpgrade() {
    console.log("upgrade");
  }

  return (
    <div className="hostShell" data-host-theme={theme}>
      <TopNav
        user={user}
        onOpenHostProfile={() => setHostProfileOpen(true)}
        subscription={subscription}
        onOpenSettings={handleOpenSettings}
        onOpenBilling={handleOpenBilling}
        onUpgrade={handleUpgrade}
        onLogout={logout}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
      />
      <main>
        <Outlet />
      </main>
      <HostProfileModal
        open={hostProfileOpen}
        onClose={() => setHostProfileOpen(false)}
      />
    </div>
  );
}
