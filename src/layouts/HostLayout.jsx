// client/src/layouts/HostLayout.jsx
import { Outlet } from "react-router-dom";
import TopNav from "../components/TopNav/TopNav";
import { useAuthStore } from "../stores/authStore";
import HostProfileModal from "../components/HostProfileModal/HostProfileModal";

import { useState } from "react";

export default function HostLayout() {
  const { user, logout } = useAuthStore();
  const [hostProfileOpen, setHostProfileOpen] = useState(false);

  // până legi abonamentul real, poți ține un stub aici
  const subscription = {
    plan: "free",
    subscriptionStatus: "inactive",
    nextBillingDate: null,
  };

  function handleOpenSettings() {
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
