// client/src/layouts/HostLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  Plus,
  BarChart3,
  CreditCard,
  Settings,
} from "lucide-react";
import "./HostLayout.css";

export default function HostLayout() {
  return (
    <div className="hostShell">
      <aside className="hostSidebar">
        <div className="sbBrand">
          <div className="sbLogo">BS</div>
          <div className="sbBrandText">
            <div className="sbName">BucovinaStay</div>
            <div className="sbSub">Host Panel</div>
          </div>
        </div>

        <nav className="sbNav">
          <NavLink end to="/host" className={({ isActive }) => `sbItem ${isActive ? "active" : ""}`}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink to="/host/listings" className={({ isActive }) => `sbItem ${isActive ? "active" : ""}`}>
            <Home size={18} />
            Proprietățile mele
          </NavLink>

          <NavLink to="/host/add" className={({ isActive }) => `sbItem ${isActive ? "active" : ""}`}>
            <Plus size={18} />
            Adaugă proprietate
          </NavLink>

          <NavLink to="/host/stats" className={({ isActive }) => `sbItem ${isActive ? "active" : ""}`}>
            <BarChart3 size={18} />
            Statistici
          </NavLink>

          <NavLink to="/host/billing" className={({ isActive }) => `sbItem ${isActive ? "active" : ""}`}>
            <CreditCard size={18} />
            Abonament
          </NavLink>

          <NavLink to="/host/settings" className={({ isActive }) => `sbItem ${isActive ? "active" : ""}`}>
            <Settings size={18} />
            Setări
          </NavLink>
        </nav>

        <div className="sbFooter">{/* plan card etc */}</div>
      </aside>

      <main className="hostMain">
        <Outlet />
      </main>
    </div>
  );
}
