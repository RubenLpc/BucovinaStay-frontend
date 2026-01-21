import { create } from "zustand";
import {
  addFavorite,
  removeFavorite,
  getMyFavoriteIds,
  getMyFavoritesPreview,
  getMyFavoritesAll,
} from "../api/favoritesService";

const toSet = (maybeSetOrArray) => {
  if (maybeSetOrArray instanceof Set) return maybeSetOrArray;
  return new Set(Array.isArray(maybeSetOrArray) ? maybeSetOrArray : []);
};

export const useFavoritesStore = create((set, get) => ({
  // auth enabled (ca să nu lovești serverul fără login)
  enabled: false,

  // ids
  favIds: new Set(),
  idsLoading: false,

  // preview (dropdown)
  preview: [],
  previewLoading: false,
  previewStale: true, // important: invalidate/refresh

  // all favorites (page)
  all: [],
  allLoading: false,
  allMeta: { page: 1, limit: 24, total: 0, totalPages: 1 },
  allStale: true,

  // anti spam per property
  busy: new Set(),

  // -----------------------------
  // lifecycle
  // -----------------------------
  setEnabled: (enabled) => {
    set({ enabled });

    // reset dacă user iese / nu e autenticat
    if (!enabled) {
      set({
        favIds: new Set(),
        idsLoading: false,
        preview: [],
        previewLoading: false,
        previewStale: true,
        all: [],
        allLoading: false,
        allMeta: { page: 1, limit: 24, total: 0, totalPages: 1 },
        allStale: true,
        busy: new Set(),
      });
    }
  },

  // -----------------------------
  // load IDs (for hearts)
  // -----------------------------
  ensureIds: async () => {
    const { enabled, idsLoading } = get();
    if (!enabled || idsLoading) return;

    set({ idsLoading: true });
    try {
      const s = await getMyFavoriteIds(); // returns Set
      set({ favIds: toSet(s) });
    } finally {
      set({ idsLoading: false });
    }
  },

  // -----------------------------
  // Preview (dropdown)
  // -----------------------------
  invalidatePreview: () => set({ previewStale: true }),

  ensurePreview: async (limit = 6) => {
    const { enabled, previewLoading, previewStale, preview } = get();
    if (!enabled || previewLoading) return;

    // dacă nu e stale și deja ai items, nu refetch
    if (!previewStale && preview?.length) return;

    set({ previewLoading: true });
    try {
      const items = await getMyFavoritesPreview(limit);
      set({ preview: items, previewStale: false });
    } finally {
      set({ previewLoading: false });
    }
  },

  // -----------------------------
  // All (page)
  // -----------------------------
  invalidateAll: () => set({ allStale: true }),

  loadAll: async ({ page = 1, limit = 24 } = {}) => {
    const { enabled, allLoading } = get();
    if (!enabled || allLoading) return;

    set({ allLoading: true });
    try {
      const data = await getMyFavoritesAll({ page, limit });
      set({
        all: data.items || [],
        allMeta: {
          page: data.page || page,
          limit: data.limit || limit,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        },
        allStale: false,
      });
    } finally {
      set({ allLoading: false });
    }
  },

  // -----------------------------
  // Toggle favorite (optimistic + sync)
  // -----------------------------
  toggleFavorite: async (propertyId) => {
    const { enabled, busy, favIds } = get();
    if (!enabled) return;

    if (busy.has(propertyId)) return;

    // mark busy
    const nextBusy = new Set(busy);
    nextBusy.add(propertyId);
    set({ busy: nextBusy });

    const wasFav = favIds.has(propertyId);

    // optimistic update IDs
    set((state) => {
      const next = new Set(state.favIds);
      wasFav ? next.delete(propertyId) : next.add(propertyId);
      return { favIds: next };
    });

    // optimistic update preview & all (instant wow)
    set((state) => {
      let nextPreview = state.preview;
      let nextAll = state.all;

      if (wasFav) {
        // remove from lists
        nextPreview = (state.preview || []).filter((x) => x.id !== propertyId);
        nextAll = (state.all || []).filter((x) => x.id !== propertyId);
      } else {
        // we don't have full object -> mark stale so it refetches on next open / next load
        // (asta e corect: altfel inventăm date)
        // dacă vrei, putem injecta un placeholder, dar mai bine curat.
      }

      return {
        preview: nextPreview,
        all: nextAll,
        previewStale: !wasFav ? true : state.previewStale,
        allStale: !wasFav ? true : state.allStale,
      };
    });

    try {
      if (wasFav) await removeFavorite(propertyId);
      else await addFavorite(propertyId);

      // după succes: pentru add (nu avem date), lăsăm stale și îl va lua corect din server
      // pentru remove: deja e curățat
    } catch (e) {
      // rollback IDs
      set((state) => {
        const next = new Set(state.favIds);
        wasFav ? next.add(propertyId) : next.delete(propertyId);
        return { favIds: next };
      });

      // rollback lists: cel mai sigur -> invalidăm și refetch la următoarea acțiune
      set({ previewStale: true, allStale: true });

      throw new Error("Nu am putut actualiza favoritele.");
    } finally {
      // unmark busy
      set((state) => {
        const nb = new Set(state.busy);
        nb.delete(propertyId);
        return { busy: nb };
      });
    }
  },
}));
