import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { authService } from "../api/authService";
import { onMaintenance } from "../api/client";

export default function MainLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === "/" || pathname === "/trasee";

  // global maintenance redirect
  useEffect(() => {
    return onMaintenance((payload) => {
      navigate("/maintenance", { replace: true, state: payload || null });
    });
  }, [navigate]);

  // session bootstrap
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authService.getMe().catch(() => {
        localStorage.removeItem("token");
      });
    }
  }, []);

  return (
    <>
      <Header />
      <main className={`app-main ${isHome ? "noOffset" : "withOffset"}`}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
