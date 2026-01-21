import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useFavoritesStore } from "../../stores/favoritesStore";

import "./Favorites.css";

export default function Favorites() {
  const { isAuthenticated } = useAuthStore();

  const setFavEnabled = useFavoritesStore((s) => s.setEnabled);
  const loadAll = useFavoritesStore((s) => s.loadAll);
  const all = useFavoritesStore((s) => s.all);
  const allLoading = useFavoritesStore((s) => s.allLoading);
  const allMeta = useFavoritesStore((s) => s.allMeta);
  const allStale = useFavoritesStore((s) => s.allStale);

  const [page, setPage] = useState(1);

  useEffect(() => {
    setFavEnabled(!!isAuthenticated);
  }, [isAuthenticated, setFavEnabled]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // dacă e stale sau pagina s-a schimbat, încărcăm
    loadAll({ page, limit: 24 });
  }, [isAuthenticated, page, loadAll, allStale]);

  const hasItems = (all || []).length > 0;

  const subtitle = useMemo(() => {
    if (!isAuthenticated) return "Autentifică-te ca să vezi cazările salvate.";
    if (allLoading) return "Se încarcă…";
    if (!hasItems) return "Nu ai favorite încă. Explorează cazările și apasă ❤️.";
    return `Ai ${allMeta.total} ${allMeta.total === 1 ? "favorit" : "favorite"}.`;
  }, [isAuthenticated, allLoading, hasItems, allMeta.total]);

  return (
    <main className="favPage ">
      <div className="container">
        <div className="favTop">
          <div>
            <h1 className="text-page-title favTitle">
              <Heart size={22} />
              Favorite
            </h1>
            <p className="text-muted">{subtitle}</p>
          </div>

          <div className="favActions">
            <Link to="/cazari" className="btn btn-accent">
              Explorează cazări
            </Link>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="favGate">
            <div className="favGateCard">
              <div className="favGateTitle">Trebuie să fii autentificat</div>
              <div className="favGateText">Intră în cont ca să îți păstrezi lista de favorite.</div>
              <Link to="/auth/login" className="btn btn-primary">
                Autentificare
              </Link>
            </div>
          </div>
        ) : allLoading ? (
          <div className="favLoading">
            <Loader2 className="spin" size={20} />
            Se încarcă favoritele…
          </div>
        ) : !hasItems ? (
          <div className="favEmpty">
            <div className="favEmptyCard">
              <div className="favEmptyTitle">Încă nu ai favorite</div>
              <div className="favEmptyText">
                Când găsești o cazare care îți place, apasă ❤️ și o vei vedea aici.
              </div>
              <Link to="/cazari" className="btn btn-primary">
                Vezi cazări
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="favGrid">
              {all.map((p) => (
                <Link key={p.id} to={`/cazari/${p.id}`} className="favCard">
                  <div
                    className="favImg"
                    style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}
                    aria-label={p.title}
                  />
                  <div className="favBody">
                    <div className="favCardTitle">{p.title}</div>
                    <div className="favCardSub">
                      {(p.location || p.city || "Bucovina") +
                        (typeof p.pricePerNight === "number"
                          ? ` • ${p.pricePerNight} ${p.currency || "RON"}/noapte`
                          : "")}
                    </div>
                  </div>
                </Link>
              ))}
            </section>

            <div className="favPager">
              <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Înapoi
              </button>

              <div className="favPagerMeta">
                Pagina <b>{page}</b> din <b>{allMeta.totalPages}</b>
              </div>

              <button
                className="btn"
                disabled={page >= allMeta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Înainte
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
