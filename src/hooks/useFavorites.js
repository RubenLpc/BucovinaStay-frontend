// client/src/hooks/useFavorites.js
import { useEffect, useRef, useState } from "react";
import { addFavorite, getMyFavoriteIds, removeFavorite } from "../api/favoritesService";

export function useFavorites(enabled) {
  const [favIds, setFavIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const busy = useRef(new Set()); // prevent spam-click per id

  useEffect(() => {
    if (!enabled) {
      setFavIds(new Set());
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const s = await getMyFavoriteIds();
        if (!alive) return;
        setFavIds(s);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [enabled]);

  const toggle = async (id) => {
    if (busy.current.has(id)) return;
    busy.current.add(id);

    const wasFav = favIds.has(id);

    // optimistic
    setFavIds((prev) => {
      const next = new Set(prev);
      wasFav ? next.delete(id) : next.add(id);
      return next;
    });

    try {

      if (wasFav) await removeFavorite(id);

      else await addFavorite(id);
      console.log("FAV OK", { id, wasFav });

    } catch (e) {
      console.error("FAV FAIL", e);
    

      // rollback
      setFavIds((prev) => {
        const next = new Set(prev);
        wasFav ? next.add(id) : next.delete(id);
        return next;
      });
      throw new Error("Nu am putut actualiza favoritele.");
    } finally {
      busy.current.delete(id);
    }
  };

  return { favIds, toggle, loading };
}
