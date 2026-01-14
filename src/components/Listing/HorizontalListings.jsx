import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./HorizontalListings.css";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAnalyticsImpressions } from "../../hooks/useAnalyticsImpressions";
import { trackClick } from "../../api/analyticsService";


import { useAuthStore } from "../../stores/authStore";
import { useFavorites } from "../../hooks/useFavorites";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
  Sparkles,
  Crown,
  BadgeCheck,
  Flame,
  Mountain,
  Leaf,
  Coffee,
  MapPin,
  Users,
  ArrowRight,
} from "lucide-react";

/* ------------ utils ------------ */
const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop stop-color="#eef1ed"/>
        <stop offset="1" stop-color="#f9faf8"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      font-family="Arial" font-size="34" fill="#6b7280">BucovinaStay</text>
  </svg>
`);

function safeImg(src) {
  if (!src) return FALLBACK_IMG;
  if (typeof src !== "string") return FALLBACK_IMG;
  if (!src.startsWith("http") && !src.startsWith("data:") && !src.startsWith("/")) return FALLBACK_IMG;
  return src;
}

function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0;
  const idx = Math.floor((sortedAsc.length - 1) * p);
  return sortedAsc[idx];
}

function smartScore(l) {
  let s = 0;
  const rating = typeof l.rating === "number" ? l.rating : 0;
  s += rating * 22;
  s += Math.max(0, 420 - (l.pricePerNight ?? 999)) * 0.08;

  const a = l.amenities || [];
  if (a.includes("wifi")) s += 3;
  if (a.includes("parking")) s += 3;
  if (a.includes("breakfast")) s += 3;
  if (a.includes("spa") || a.includes("sauna")) s += 7;
  if (a.includes("view")) s += 4;
  if (a.includes("quiet")) s += 2;
  if ((l.guests ?? 0) >= 4 || a.includes("family")) s += 2;
  return s;
}

const BADGE_META = {
  top: { label: "Top", tone: "gold", Icon: Crown },
  spa: { label: "Spa", tone: "pink", Icon: Flame },
  new: { label: "Nou", tone: "blue", Icon: Sparkles },
  value: { label: "Best value", tone: "green", Icon: BadgeCheck },
  view: { label: "Priveliște", tone: "violet", Icon: Mountain },
  family: { label: "Familie", tone: "teal", Icon: Leaf },
  breakfast: { label: "Mic dejun", tone: "amber", Icon: Coffee },
  recommended: { label: "Recomandat", tone: "dark", Icon: Sparkles },
};

function computeBadges(listing, ctx) {
  if (Array.isArray(listing.badges) && listing.badges.length) return listing.badges.slice(0, 2);

  const a = listing.amenities || [];
  const rating = typeof listing.rating === "number" ? listing.rating : null;

  const out = [];
  if (rating != null && rating >= 4.85) out.push("top");
  if (out.length < 2 && (a.includes("spa") || a.includes("sauna"))) out.push("spa");

  if (out.length < 2 && listing.createdAt) {
    const days = (ctx.now - new Date(listing.createdAt)) / (1000 * 60 * 60 * 24);
    if (days <= 14) out.push("new");
  }

  if (out.length < 2 && (listing.pricePerNight ?? 999999) <= ctx.cheapThreshold) out.push("value");
  if (out.length < 2 && a.includes("view")) out.push("view");
  if (out.length < 2 && ((listing.guests ?? 0) >= 4 || a.includes("family"))) out.push("family");
  if (out.length < 2 && ctx.smartPickIds.has(listing.id)) out.push("recommended");

  return out.slice(0, 2);
}

function formatMoney(v, currency = "RON") {
  if (typeof v !== "number") return "—";
  try {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${v} ${currency}`;
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function BadgeStack({ badges }) {
  if (!badges?.length) return null;
  return (
    <div className="hl2-badges" aria-label="Badges">
      {badges.map((k) => {
        const meta = BADGE_META[k] || BADGE_META.recommended;
        const Icon = meta.Icon;
        return (
          <span key={k} className={`hl2-badge tone-${meta.tone}`} title={meta.label}>
            <Icon size={14} className="hl2-badgeIcon" aria-hidden="true" />
            <span className="hl2-badgeText">{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="hl2-card hl2-skel" aria-hidden="true">
      <div className="hl2-media">
        <div className="hl2-skelImg" />
        <div className="hl2-skelTop" />
      </div>
      <div className="hl2-body">
        <div className="hl2-skelLine w60" />
        <div className="hl2-skelLine w90" />
        <div className="hl2-skelLine w40" />
      </div>
    </div>
  );
}

/* ------------ component ------------ */
export default function HorizontalListings({
  title = "Cazări recomandate",
  subtitle = "Selecție atent aleasă pentru Bucovina",
  items = [],
  loading = false,
  onSeeAll, // optional callback (ex: navigate la /cazari?...)
}) {

  useAnalyticsImpressions(items);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { favIds, toggle: toggleFav } = useFavorites(isAuthenticated);

  const trackRef = useRef(null);
  const rafRef = useRef(0);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

  // drag-to-scroll (premium feel)
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });

  const ctx = useMemo(() => {
    const now = new Date();
    const prices = items
      .map((x) => x.pricePerNight)
      .filter((v) => typeof v === "number")
      .sort((a, b) => a - b);

    const cheapThreshold = percentile(prices, 0.25);

    const scored = items
      .map((x) => ({ id: x.id, score: smartScore(x) }))
      .sort((a, b) => b.score - a.score);

    const topN = Math.max(1, Math.floor(scored.length * 0.1));
    const smartPickIds = new Set(scored.slice(0, topN).map((s) => s.id));

    return { now, cheapThreshold, smartPickIds };
  }, [items]);

  

  const open = useCallback(
    (id) => {
      trackClick(id, "open");

      navigate(`/cazari/${id}`);
    },
    [navigate]
  );

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const p = maxScroll <= 0 ? 0 : el.scrollLeft / maxScroll;

    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    setProgress(clamp(p, 0, 1));
  }, []);

  const scheduleMeasure = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    scheduleMeasure();
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => scheduleMeasure();
    el.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => scheduleMeasure();
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [items, scheduleMeasure]);

  const handleScroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = parseFloat(getComputedStyle(el).getPropertyValue("--cardW")) || 360;
    const gap = parseFloat(getComputedStyle(el).getPropertyValue("--gap")) || 18;
    el.scrollBy({ left: dir * (cardW + gap) * 2, behavior: "smooth" });
  };

  const isInteractive = (el) =>
    !!el.closest?.("button, a, input, textarea, select, [role='button']");
  
  const onPointerDown = (e) => {
    // ✅ pe desktop (mouse) nu mai capturăm pointer-ul (nu stricăm click)
    if (e.pointerType === "mouse") return;
  
    // ✅ nu porni drag dacă user apasă pe buton/link
    if (isInteractive(e.target)) return;
  
    const el = trackRef.current;
    if (!el) return;
  
    drag.current.down = true;
    drag.current.x = e.clientX;
    drag.current.left = el.scrollLeft;
    drag.current.moved = false;
  
    el.setPointerCapture?.(e.pointerId);
    el.classList.add("is-dragging");
  };
  
  const onPointerMove = (e) => {
    if (e.pointerType === "mouse") return;
    const el = trackRef.current;
    if (!el || !drag.current.down) return;
  
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 6) drag.current.moved = true;
    el.scrollLeft = drag.current.left - dx;
  };
  
  const onPointerUp = (e) => {
    if (e.pointerType === "mouse") return;
    const el = trackRef.current;
    if (!el) return;
  
    drag.current.down = false;
    el.releasePointerCapture?.(e.pointerId);
    el.classList.remove("is-dragging");
  };
  

  const shouldBlockClick = () => drag.current.moved;

  const renderItems = items?.length ? items : [];

  return (
    <section className="container hl2-wrap">
      <header className="hl2-head">
        <div className="hl2-headLeft">
          <div className="hl2-kicker">BucovinaStay Picks</div>
          <h2 className="hl2-title">{title}</h2>
          {subtitle ? <p className="hl2-subtitle">{subtitle}</p> : null}
        </div>

        <div className="hl2-actions">
          {typeof onSeeAll === "function" ? (
            <button type="button" className="hl2-seeAll" onClick={onSeeAll}>
              Vezi toate <ArrowRight size={16} />
            </button>
          ) : null}

          <div className="hl2-progress" aria-hidden="true">
            <span className="hl2-progressFill" style={{ transform: `scaleX(${progress})` }} />
          </div>

          <button
            className="hl2-arrow"
            type="button"
            onClick={() => handleScroll(-1)}
            disabled={!canLeft}
            aria-label="Scroll stânga"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="hl2-arrow"
            type="button"
            onClick={() => handleScroll(1)}
            disabled={!canRight}
            aria-label="Scroll dreapta"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="hl2-viewport">
       

        <div
          ref={trackRef}
          className="hl2-track"
          role="list"
          aria-label="Cazări recomandate"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : !renderItems.length ? (
            <div className="hl2-empty" role="status" aria-live="polite">
              <div className="hl2-emptyCard">
                <div className="hl2-emptyTitle">Nu avem recomandări momentan</div>
                <div className="hl2-emptyText">Încearcă să alegi alt oraș sau revino mai târziu.</div>
              </div>
            </div>
          ) : (
            renderItems.map((x) => {
              const isFav = favIds.has(x.id);
              const badges = computeBadges(x, ctx);

              const ratingNum = typeof x.rating === "number" ? x.rating : 0;
              const reviewsNum = typeof x.reviews === "number" ? x.reviews : 0;

              const priceText = formatMoney(
                typeof x.pricePerNight === "number" ? x.pricePerNight : null,
                x.currency || "RON"
              );

              return (
                <article
                  key={x.id}
                  className="hl2-card"
                  role="listitem"
                  tabIndex={0}
                  onClick={() => {
                    if (shouldBlockClick()) return;
                    open(x.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open(x.id);
                    }
                  }}
                  aria-label={`Deschide cazarea ${x.title}`}
                >
                  <div className="hl2-media">
                    <img
                      src={safeImg(x.image)}
                      alt={x.title || "Cazare"}
                      loading="lazy"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMG;
                      }}
                    />

                    <div className="hl2-overlay" aria-hidden="true" />
                    <div className="hl2-shine" aria-hidden="true" />

                    <BadgeStack badges={badges} />

                    <button
                      type="button"
                      className={`hl2-fav ${isFav ? "active" : ""} ${!isAuthenticated ? "locked" : ""}`}
                      aria-label={isFav ? "Scoate din favorite" : "Adaugă la favorite"}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          toast.info("Trebuie să fii autentificat", {
                            description: "Autentifică-te pentru a salva cazări la favorite.",
                          });
                          return;
                        }
                        try {
                          await toggleFav(x.id);
                        } catch {
                          toast.error("Nu am putut actualiza favoritele.");
                        }
                      }}
                    >
                      <Heart size={18} className="hl2-favIcon" aria-hidden="true" />
                    </button>

                    <div className="hl2-rating" title="Rating">
                      <Star size={14} className="hl2-star" aria-hidden="true" />
                      <span className="hl2-ratingNum">{ratingNum > 0 ? ratingNum.toFixed(1) : "0.0"}</span>
                      <span className="hl2-ratingSep">•</span>
                      <span className="hl2-reviews">{reviewsNum}</span>
                    </div>
                  </div>

                  <div className="hl2-body">
                    <div className="hl2-topRow">
                      <div className="hl2-location" title={x.location || ""}>
                        <MapPin size={14} aria-hidden="true" />
                        <span>{x.location || "—"}</span>
                      </div>

                      <div className="hl2-price" title="Preț pe noapte">
                        <span className="hl2-priceNum">{priceText}</span>
                        <span className="hl2-night">/ noapte</span>
                      </div>
                    </div>

                    <h3 className="hl2-name" title={x.title || ""}>
                      {x.title || "Fără titlu"}
                    </h3>

                    <div className="hl2-bottomRow">
                      <div className="hl2-meta">
                        <Users size={14} aria-hidden="true" />
                        <span>
                          max <strong>{x.guests ?? "—"}</strong> oaspeți
                        </span>
                      </div>

                      <div className="hl2-cta">
                        Vezi detalii <span className="hl2-ctaArrow">→</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
