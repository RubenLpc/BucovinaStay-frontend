import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { Outlet,useLocation } from "react-router-dom";
import { useEffect } from "react";
import { authService } from "../api/authService";
import { Toaster } from "sonner";


export default function MainLayout() {

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authService.getMe().catch(() => {
        localStorage.removeItem("token");
      });
    }
  }, []);

  const { pathname } = useLocation();
  const isHome = pathname === "/" || pathname === "/trasee";
  
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
