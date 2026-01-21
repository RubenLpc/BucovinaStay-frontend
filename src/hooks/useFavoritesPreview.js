import { useCallback, useState } from "react";
import { getMyFavoritesPreview } from "../api/favoritesService";

export function useFavoritesPreview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    if (loadedOnce) return;
    setLoading(true);
    try {
      const rows = await getMyFavoritesPreview(6);
      setItems(rows);
      setLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [loadedOnce]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getMyFavoritesPreview(6);
      setItems(rows);
      setLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, load, refresh, loadedOnce };
}
