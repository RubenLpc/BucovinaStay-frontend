import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { Outlet } from "react-router-dom";
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
  
  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
