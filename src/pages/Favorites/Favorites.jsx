import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/authStore";
import { useFavoritesStore } from "../../stores/favoritesStore";

import "./Favorites.css";

function FavSkeleton() {
  return (
    <div className="favGrid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="favSkeletonCard">
          <div className="favSkeletonMedia" />
          <div className="favSkeletonBody">
            <div className="favSkeletonLine w70" />
            <div className="favSkeletonLine w45" />
            <div className="favSkeletonLine w55" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Favorites() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";
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
    loadAll({ page, limit: 24 });
  }, [isAuthenticated, page, loadAll, allStale]);

  const hasItems = (all || []).length > 0;

  const subtitle = useMemo(() => {
    if (!isAuthenticated) return t("favPage.subtitle.notAuth");
    if (allLoading) return t("favPage.subtitle.loading");
    if (!hasItems) return t("favPage.subtitle.empty");
    return t("favPage.subtitle.count", { count: allMeta.total });
  }, [isAuthenticated, allLoading, hasItems, allMeta.total, t]);

  function formatPrice(p, currency = "RON") {
    const n = Number(p);
    if (!Number.isFinite(n) || n <= 0) return null;
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n} ${currency}`;
    }
  }

  return (
    <main className="favPage">
      <div className="container">
        <div className="favTop">
          <div>
            <h1 className="text-page-title favTitle">
              <Heart size={22} />
              {t("favorites.title")}
            </h1>
            <p className="text-muted">{subtitle}</p>
          </div>

          <div className="favActions">
            <Link to="/cazari" className="btn btn-accent">
              {t("favPage.explore")}
            </Link>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="favGate">
            <div className="favGateCard">
              <div className="favGateTitle">{t("favPage.gate.title")}</div>
              <div className="favGateText">{t("favPage.gate.text")}</div>
              <Link to="/auth/login" className="btn btn-primary">
                {t("favPage.gate.cta")}
              </Link>
            </div>
          </div>
        ) : allLoading ? (
          <FavSkeleton />
        ) : !hasItems ? (
          <div className="favEmpty">
            <div className="favEmptyCard">
              <div className="favEmptyTitle">{t("favPage.empty.title")}</div>
              <div className="favEmptyText">{t("favPage.empty.text")}</div>
              <Link to="/cazari" className="btn btn-primary">
                {t("favPage.empty.cta")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="favGrid">
              {all.map((p) => {
                const price = formatPrice(p.pricePerNight, p.currency);
                const location = p.locality || p.city || p.location || "—";
                const rating = Number(p.ratingAvg ?? p.rating);
                const hasRating = Number.isFinite(rating) && rating > 0;
                const reviews = Number(p.reviewsCount ?? p.reviews ?? 0);

                return (
                  <Link key={p.id} to={`/cazari/${p.id}`} className="favCard">
                    <div
                      className="favImg"
                      style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}
                      aria-label={p.title}
                    >
                      {hasRating ? (
                        <div className="favRatingChip">
                          <Star size={11} />
                          <span>{rating.toFixed(1)}</span>
                          {reviews > 0 ? <span className="favRatingCount">({reviews})</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="favBody">
                      <div className="favCardTitle">{p.title}</div>
                      <div className="favCardSub">
                        {location}
                        {price ? ` • ${price}/noapte` : ""}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </section>

            {allMeta.totalPages > 1 ? (
              <div className="favPager">
                <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t("favPage.pager.prev")}
                </button>

                <div className="favPagerMeta">
                  {t("favPage.pager.page", { page, total: allMeta.totalPages })}
                </div>

                <button
                  className="btn"
                  disabled={page >= allMeta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("favPage.pager.next")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
