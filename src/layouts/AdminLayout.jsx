import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import AdminTopNav from "../components/AdminTopNav/AdminTopNav";
import { useEffect, useState } from "react";

const ADMIN_THEME_KEY = "admin-theme";

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(ADMIN_THEME_KEY) || "light");

  useEffect(() => {
    localStorage.setItem(ADMIN_THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="adShell" data-admin-theme={theme}>
      <AdminTopNav
        user={user}
        open={open}
        setOpen={setOpen}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        onOpenSettings={() => navigate("/admin/settings")}
        onLogout={() => {
          logout();
          navigate("/", { replace: true });
        }}
      />

      <div className="container">
        <main className="adMainWrap">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
