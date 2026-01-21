import { useEffect } from "react";
import { useFavoritesStore } from "../stores/favoritesStore";

export function useFavorites(enabled) {
  const setEnabled = useFavoritesStore((s) => s.setEnabled);
  const ensureIds = useFavoritesStore((s) => s.ensureIds);
  const favIds = useFavoritesStore((s) => s.favIds);
  const loading = useFavoritesStore((s) => s.idsLoading);
  const toggle = useFavoritesStore((s) => s.toggleFavorite);

  useEffect(() => {
    setEnabled(!!enabled);
    if (enabled) ensureIds();
  }, [enabled, setEnabled, ensureIds]);

  return { favIds, toggle, loading };
}
