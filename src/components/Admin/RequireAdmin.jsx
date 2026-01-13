// client/src/components/RequireAdmin.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export default function RequireAdmin({ children }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return children;
}
