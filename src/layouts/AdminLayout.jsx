import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import AdminTopNav from "../components/AdminTopNav/AdminTopNav";
import { useState } from "react";

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdminTopNav
        user={user}
        open={open}
        setOpen={setOpen}
        onOpenSettings={() => navigate("/admin/settings")}
        onLogout={() => {
          logout();
          navigate("/", { replace: true });
        }}
      />

      <div className="container">
      <main className="adMainWrap">
        <Outlet />
      </main></div>
    </>
  );
}
