import { Outlet } from "react-router-dom";
import "../pages/Auth/Auth.css";
import heroImage from "../assets/images/hero-bucovina.png";
import { Toaster } from "sonner";


export default function AuthLayout() {
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
