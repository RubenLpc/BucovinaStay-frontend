// client/src/layouts/HostLayout.jsx
import { Outlet } from "react-router-dom";
import TopNav from "../components/TopNav/TopNav";
import { useAuthStore } from "../stores/authStore";
import HostProfileModal from "../components/HostProfileModal/HostProfileModal";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { onMaintenance } from "../api/client";

import { useState } from "react";

export default function HostLayout() {
  const { user, logout } = useAuthStore();
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  const navigate = useNavigate();
  const [mt, setMt] = useState(null);

  useEffect(() => {
    return onMaintenance((payload) => {
      setMt(payload || { message: "Maintenance" });
      navigate("/maintenance", { replace: true, state: payload || null });
    });
  }, [navigate]);
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
    <>
      <TopNav
        user={user}
        onOpenHostProfile={() => setHostProfileOpen(true)}
        subscription={subscription}
        onOpenSettings={handleOpenSettings}
        onOpenBilling={handleOpenBilling}
        onUpgrade={handleUpgrade}
        onLogout={logout}
      />
      <main>
        <Outlet />
      </main>
      <HostProfileModal
        open={hostProfileOpen}
        onClose={() => setHostProfileOpen(false)}
      />
    </>
  );
}
