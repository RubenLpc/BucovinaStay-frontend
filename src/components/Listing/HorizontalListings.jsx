import React, { useMemo, useRef, useState } from "react";
import "./HorizontalListings.css";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { toast } from "sonner";

/* util: percentilă simplă */
function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0;
  const idx = Math.floor((sortedAsc.length - 1) * p);
  return sortedAsc[idx];
}

/* AI-like score (heuristic): folosit pt “Recomandat” */
function smartScore(l) {
  let s = 0;
  const rating = typeof l.rating === "number" ? l.rating : 0;
  s += rating * 22; // 0..~110

  // preț: mai ieftin => puncte
  s += Math.max(0, 420 - (l.price ?? 999)) * 0.08;

  const a = l.amenities || [];
  if (a.includes("wifi")) s += 3;
  if (a.includes("parking")) s += 3;
  if (a.includes("breakfast")) s += 3;
  if (a.includes("spa") || a.includes("sauna")) s += 7;
  if (a.includes("view")) s += 4;
  if (a.includes("quiet")) s += 2;

  // familie
  if ((l.guests ?? 0) >= 4 || a.includes("family")) s += 2;

  return s;
}

/* badge principal: max 1 per card, după prioritate */
function getBadge(listing, ctx) {
  const a = listing.amenities || [];
  const rating = typeof listing.rating === "number" ? listing.rating : null;

  // 1) Top rated
  if (rating !== null && rating >= 4.85)
    return { text: "Top", tone: "gold", icon: "★" };

  // 2) Spa
  if (a.includes("spa") || a.includes("sauna"))
    return { text: "Spa", tone: "pink", icon: "♨" };

  // 3) New (14 zile)
  if (listing.createdAt) {
    const created = new Date(listing.createdAt);
    const days = (ctx.now - created) / (1000 * 60 * 60 * 24);
    if (days <= 14) return { text: "Nou", tone: "blue", icon: "●" };
  }

  // 4) Best value
  if ((listing.price ?? 999999) <= ctx.cheapThreshold)
    return { text: "Best value", tone: "green", icon: "✓" };

  // 5) Scenic / Family
  if (a.includes("view"))
    return { text: "Priveliște", tone: "violet", icon: "⛰" };
  if ((listing.guests ?? 0) >= 4 || a.includes("family"))
    return { text: "Familie", tone: "teal", icon: "👨‍👩‍👧‍👦" };

  // 6) Smart pick (AI-like)
  if (ctx.smartPickIds.has(listing.id))
    return { text: "Recomandat", tone: "dark", icon: "✨" };

  return null;
}

export default function HorizontalListings({
  title = "Cazări recomandate",
  subtitle = "Alege o cazare potrivită pentru Bucovina",
  items = [],
  onOpen = (id) => console.log("Open listing:", id),
}) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const trackRef = useRef(null);
  const [favorites, setFavorites] = useState(() => new Set());

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const scrollByAmount = useMemo(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    return isMobile ? 320 : 760;
  }, []);

  const handleScroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * scrollByAmount, behavior: "smooth" });
  };

  // context pentru badge-uri (cheap threshold + smart pick)
  const ctx = useMemo(() => {
    const now = new Date();

    const prices = items
      .map((x) => x.price)
      .filter((v) => typeof v === "number")
      .sort((a, b) => a - b);

    const cheapThreshold = percentile(prices, 0.25);

    // smart pick = top 10% scor
    const scored = items
      .map((x) => ({ id: x.id, score: smartScore(x) }))
      .sort((a, b) => b.score - a.score);

    const topN = Math.max(1, Math.floor(scored.length * 0.1));
    const smartPickIds = new Set(scored.slice(0, topN).map((s) => s.id));

    return { now, cheapThreshold, smartPickIds };
  }, [items]);

  return (
    <section className="container hl-wrap">
      <div className="hl-head">
        <div>
          <h2 className="text-section-title hl-title">{title}</h2>
          {subtitle ? (
            <p className="text-muted hl-subtitle">{subtitle}</p>
          ) : null}
        </div>

        <div className="hl-controls">
          <button
            className="btn btn-secondary"
            onClick={() => handleScroll(-1)}
            aria-label="Scroll left"
          >
            ◀
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleScroll(1)}
            aria-label="Scroll right"
          >
            ▶
          </button>
        </div>
      </div>

      <div ref={trackRef} className="hl-track" role="list">
        {items.map((x) => {
          const isFav = favorites.has(x.id);
          const badge = getBadge(x, ctx);

          return (
            <article
              key={x.id}
              className="hl-card"
              role="listitem"
              tabIndex={0}
              onClick={() => onOpen(x.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(x.id);
                }
              }}
              aria-label={`Deschide cazarea ${x.title}`}
            >
              <div className="hl-img">
                <img
                  src={x.image}
                  alt={x.title}
                  loading="lazy"
                  draggable={false}
                />

                <div className="hl-glass" aria-hidden="true" />

                {badge ? (
                  <span
                    className={`hl-badge tone-${badge.tone}`}
                    title="Badge generat automat"
                  >
                    <span className="hl-badge-icon" aria-hidden="true">
                      {badge.icon}
                    </span>
                    <span className="hl-badge-text">{badge.text}</span>
                  </span>
                ) : null}

                <button
                  className={`hl-fav ${isFav ? "is-active" : ""} ${
                    !isAuthenticated ? "is-locked" : ""
                  }`}
                  aria-label={
                    isFav ? "Scoate din favorite" : "Adaugă la favorite"
                  }
                  onClick={(e) => {
                    e.stopPropagation();

                    if (!isAuthenticated) {
                      toast.info("Trebuie să fii autentificat", {
                        description:
                          "Autentifică-te pentru a salva cazări la favorite.",
                      });
                      return;
                    }

                    const wasFav = favorites.has(x.id);
                    toggleFavorite(x.id);

                    if (!wasFav) {
                      toast.success("Adăugat la favorite", {
                        description: `${x.title} • ${x.location}`,
                      });
                    } else {
                      toast.message("Scos din favorite", {
                        description: `${x.title} • ${x.location}`,
                      });
                    }
                  }}
                >
                  ♥
                </button>
              </div>

              <div className="hl-body">
                <div className="hl-topline">
                  <div className="hl-location">{x.location}</div>

                  <div className="hl-rating" title="Rating">
                    <span className="hl-star">★</span>
                    {typeof x.rating === "number" ? x.rating.toFixed(1) : "—"}
                  </div>
                </div>

                <p className="hl-title2">{x.title}</p>

                <div className="hl-price">
                  <strong>{x.price} lei</strong>{" "}
                  <span className="text-muted">/ noapte</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
