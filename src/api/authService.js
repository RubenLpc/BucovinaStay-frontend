import { apiFetch } from "./client";
import { useAuthStore } from "../stores/authStore";
import { toast } from "sonner";

async function login(credentials) {

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    localStorage.setItem("token", data.token);
    useAuthStore.getState().setAuth(data.user, data.token);

    toast.success("Autentificare reușită", {
      description: `Bine ai revenit, ${data.user.name}!`,
    });

    return data;
  } catch (error) {
    toast.error("Autentificare eșuată", {
      description: error.message || "Email sau parolă incorectă",
    });
    throw error;
  }
}

async function register(details) {
  try {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(details),
    });

    localStorage.setItem("token", data.token);
    useAuthStore.getState().setAuth(data.user, data.token);

    toast.success("Cont creat cu succes", {
      description: "Ești acum autentificat",
    });

    return data;
  } catch (error) {
    toast.error("Înregistrare eșuată", {
      description: error.message || "A apărut o eroare",
    });
    throw error;
  }
}

async function getMe() {
  const user = await apiFetch("/auth/me");
  useAuthStore.getState().setUser(user);
  return user;
}

async function updateMe(payload) {
    const user = await apiFetch("/auth/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  
    useAuthStore.getState().setUser(user);
    return user;
  }

async function changePassword(payload) {
    return apiFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

async function forgotPassword(payload) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function resetPassword(token, payload) {
  return apiFetch(`/auth/reset-password/${token}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const authService = {
  login,
  register,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
