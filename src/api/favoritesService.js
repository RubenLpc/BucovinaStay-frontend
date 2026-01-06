// client/src/api/favoritesService.js
import { apiFetch } from "./client";
import { toast } from "sonner";

export async function getMyFavoriteIds() {
  try {
    const data = await apiFetch("/favorites/me", { method: "GET" });
    return new Set(data.items || []);
  } catch (err) {
    toast.error("Eroare", {
      description: err.message || "Nu am putut încărca favoritele.",
    });
    throw err;
  }
}

export async function addFavorite(propertyId) {
  try {
    await apiFetch(`/favorites/${propertyId}`, { method: "POST" });

    toast.success("Adăugat la favorite", {
      description: "Cazarea a fost salvată.",
    });
  } catch (err) {
    toast.error("Eroare", {
      description: err.message || "Nu am putut adăuga la favorite.",
    });
    throw err;
  }
}

export async function removeFavorite(propertyId) {
  try {
    await apiFetch(`/favorites/${propertyId}`, { method: "DELETE" });

    toast.success("Scos din favorite", {
      description: "Cazarea a fost eliminată.",
    });
  } catch (err) {
    toast.error("Eroare", {
      description: err.message || "Nu am putut elimina din favorite.",
    });
    throw err;
  }
}
