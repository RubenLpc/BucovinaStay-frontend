import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem("token"); // 🔑
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        toast.success("Deconectare reușită", {
            description: "Ai fost delogat în siguranță.",
          });
          
      },
      
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
