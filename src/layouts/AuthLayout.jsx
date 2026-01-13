import { Outlet } from "react-router-dom";
import "../pages/Auth/Auth.css";
import heroImage from "../assets/images/hero-bucovina.png";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onMaintenance } from "../api/client";


export default function AuthLayout() {
  const navigate = useNavigate();
  const [mt, setMt] = useState(null);

  useEffect(() => {
    return onMaintenance((payload) => {
      setMt(payload || { message: "Maintenance" });
      navigate("/maintenance", { replace: true, state: payload || null });
    });
  }, [navigate]);
  return (
    <div className="auth-page">
      {/* Fundal */}
      <div
        className="auth-bg"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="auth-overlay" />

      <main className="auth-content">
        <Outlet />
      </main>
    </div>
  );
}
