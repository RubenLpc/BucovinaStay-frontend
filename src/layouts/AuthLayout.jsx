import { Outlet, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { onMaintenance } from "../api/client";
import Header from "../components/Header/Header";

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
    <>
          <Header />
    
      <Outlet />
    </>
  );
}
