import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./HorizontalListings.css";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAnalyticsImpressions } from "../../hooks/useAnalyticsImpressions";
import { trackClick } from "../../api/analyticsService";

import { useAuthStore } from "../../stores/authStore";
import { useFavorites } from "../../hooks/useFavorites";

import { useTranslation } from "react-i18next";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
  Sparkles,
  Crown,
  BadgeCheck,
  Mountain,
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

const BADGE_META = {
  top: { tone: "gold", Icon: Crown },
  spa: { tone: "pink", Icon: Sparkles },
  new: { tone: "blue", Icon: Sparkles },
  value: { tone: "green", Icon: BadgeCheck },
  view: { tone: "violet", Icon: Mountain },
  family: { tone: "teal", Icon: Users },
  breakfast: { tone: "amber", Icon: Coffee },
  recommended: { tone: "dark", Icon: Sparkles },
};

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
  const reviews = typeof l.reviews === "number" ? l.reviews : 0;
  const price = typeof l.pricePerNight === "number" ? l.pricePerNight : 9999;

  s += rating * 22;
  s += Math.min(18, Math.log10(1 + reviews) * 10);

  const priceBonus = Math.max(-12, Math.min(18, (420 - price) * 0.06));
  s += priceBonus;

  const a = Array.isArray(l.amenities) ? l.amenities : [];
  const has = (k) => a.includes(k);

  if (has("hotTub")) s += 11;
  if (has("sauna")) s += 8;
  if (has("spa")) s += 7;
  if (has("fireplace")) s += 5;

  if (has("mountainView")) s += 6;
  if (has("terrace")) s += 2;
  if (has("garden")) s += 2;
  if (has("bbq")) s += 2;

  if (has("wifi")) s += 4;
  if (has("parking") || has("freeStreetParking")) s += 3;
  if (has("selfCheckIn")) s += 4;
  if (has("privateEntrance")) s += 2;

  const kitchenParts = ["fridge", "stove", "oven", "microwave", "coffeeMaker", "kettle", "dishesAndCutlery"];
  const kitchenCount = kitchenParts.reduce((acc, k) => acc + (has(k) ? 1 : 0), 0);

  if (has("kitchen")) s += 3;
  if (kitchenCount >= 4) s += 3;
  if (kitchenCount >= 6) s += 4;

  if (has("ac")) s += 3;
  if (has("heating")) s += 2;
  if (has("hotWater")) s += 1;
  if (has("washer")) s += 2;
  if (has("iron")) s += 1;
  if (has("workspace")) s += 1;

  if (has("tv")) s += 1;
  if (has("streaming")) s += 2;
  if (has("boardGames")) s += 1;

  const guests = typeof l.guests === "number" ? l.guests : (typeof l.capacity === "number" ? l.capacity : 0);
  const familySignals = guests >= 4 || has("crib") || has("highChair") || has("washer") || has("kitchen");
  if (familySignals) s += 2;
  if ((has("crib") && has("highChair")) || guests >= 6) s += 2;

  if (has("petFriendly")) s += 1;

  const safetyKeys = ["smokeAlarm", "fireExtinguisher", "firstAidKit"];
  const safetyCount = safetyKeys.reduce((acc, k) => acc + (has(k) ? 1 : 0), 0);
  if (safetyCount >= 1) s += 1;
  if (safetyCount >= 2) s += 2;

  const essentialSignals = ["towels", "bedLinen", "hairDryer", "essentials"];
  const essentialCount = essentialSignals.reduce((acc, k) => acc + (has(k) ? 1 : 0), 0);
  if (essentialCount === 0) s -= 1;

  return s;
}

function computeBadges(listing, ctx) {
  if (Array.isArray(listing.badges) && listing.badges.length) {
    return listing.badges.slice(0, 2);
  }

  const a = Array.isArray(listing.amenities) ? listing.amenities : [];
  const has = (k) => a.includes(k);

  const rating = typeof listing.rating === "number" ? listing.rating : null;
  const reviews = typeof listing.reviews === "number" ? listing.reviews : 0;
  const price = typeof listing.pricePerNight === "number" ? listing.pricePerNight : null;

  const out = [];

  if (rating != null && rating >= 4.85 && reviews >= 8) out.push("top");

  if (out.length < 2 && (has("hotTub") || has("sauna") || has("spa") || has("fireplace"))) out.push("spa");

  if (out.length < 2 && listing.createdAt) {
    const days = (ctx.now - new Date(listing.createdAt)) / (1000 * 60 * 60 * 24);
    if (days <= 14) out.push("new");
  }

  if (out.length < 2 && price != null && price <= ctx.cheapThreshold) out.push("value");

  if (out.length < 2 && has("mountainView")) out.push("view");

  const guests =
    typeof listing.guests === "number" ? listing.guests : (typeof listing.capacity === "number" ? listing.capacity : 0);

  const familySignals = guests >= 4 || has("crib") || has("highChair") || has("kitchen") || has("washer");
  if (out.length < 2 && familySignals) out.push("family");

  if (out.length < 2 && has("breakfast")) out.push("breakfast");

  if (out.length < 2 && ctx.smartPickIds?.has?.(listing.id)) out.push("recommended");

  return out.slice(0, 2);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatMoney(v, currency = "RON", locale = "ro-RO") {
  if (typeof v !== "number") return "—";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${v} ${currency}`;
  }
}

function BadgeStack({ badges, t }) {
  if (!badges?.length) return null;

  return (
    <div className="hl2-badges" aria-label="Badges">
      {badges.map((k) => {
        const meta = BADGE_META[k] || BADGE_META.recommended;
        const Icon = meta.Icon;

        const label = t(`badges.${k}.label`);
        const desc = t(`badges.${k}.desc`);

        return (
          <span
            key={k}
            className={`hl2-badge tone-${meta.tone}`}
            title={desc || label}
          >
            <Icon size={14} className="hl2-badgeIcon" aria-hidden="true" />
            <span className="hl2-badgeText">{label}</span>
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
  title,
  subtitle,
  items = [],
  loading = false,
  onSeeAll,
}) {
  const { t, i18n } = useTranslation();

  useAnalyticsImpressions(items);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { favIds, toggle: toggleFav } = useFavorites(isAuthenticated);

  const trackRef = useRef(null);
  const rafRef = useRef(0);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [progress, setProgress] = useState(0);

  const drag = useRef({ down: false, x: 0, left: 0, moved: false });

  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";

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
    !!el?.closest?.("button, a, input, textarea, select, [role='button']");
  
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse") return;
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

  const computedTitle = title ?? t("hl.titleDefault");
  const computedSubtitle = subtitle ?? t("hl.subtitleDefault");

  return (
    <section id="hl2-listings" className="container hl2-wrap">
      <header className="hl2-head">
        <div className="hl2-headLeft">
          <div className="hl2-kicker">{t("hl.kicker")}</div>
          <h2 className="hl2-title">{computedTitle}</h2>
          {computedSubtitle ? <p className="hl2-subtitle">{computedSubtitle}</p> : null}
        </div>

        <div className="hl2-actions">
          {typeof onSeeAll === "function" ? (
            <button type="button" className="hl2-seeAll" onClick={onSeeAll}>
              {t("hl.seeAll")} <ArrowRight size={16} />
            </button>
          ) : null}

          <div className="hl2-progress" aria-hidden="true" aria-label={t("hl.progressAria")}>
            <span className="hl2-progressFill" style={{ transform: `scaleX(${progress})` }} />
          </div>

          <button
            className="hl2-arrow"
            type="button"
            onClick={() => handleScroll(-1)}
            disabled={!canLeft}
            aria-label={t("hl.scrollLeft")}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            className="hl2-arrow"
            type="button"
            onClick={() => handleScroll(1)}
            disabled={!canRight}
            aria-label={t("hl.scrollRight")}
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
          aria-label={t("hl.listAria")}
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
                <div className="hl2-emptyTitle">{t("hl.emptyTitle")}</div>
                <div className="hl2-emptyText">{t("hl.emptyText")}</div>
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
                x.currency || "RON",
                locale
              );

              const titleText = x.title || t("hl.fallbackAlt");
              const openAria = t("hl.openAria", { title: titleText });

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
                  aria-label={openAria}
                >
                  <div className="hl2-media">
                    <img
                      src={safeImg(x.image)}
                      alt={titleText}
                      loading="lazy"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMG;
                      }}
                    />

                    <div className="hl2-overlay" aria-hidden="true" />
                    <div className="hl2-shine" aria-hidden="true" />

                    <BadgeStack badges={badges} t={t} />

                    <button
                      type="button"
                      className={`hl2-fav ${isFav ? "active" : ""} ${!isAuthenticated ? "locked" : ""}`}
                      aria-label={isFav ? t("hl.favRemove") : t("hl.favAdd")}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          toast.info(t("toasts.authRequiredTitle"), {
                            description: t("toasts.authRequiredDesc"),
                          });
                          return;
                        }
                        try {
                          await toggleFav(x.id);
                        } catch {
                          toast.error(t("toasts.favUpdateFail"));
                        }
                      }}
                    >
                      <Heart size={18} className="hl2-favIcon" aria-hidden="true" />
                    </button>

                    <div className="hl2-rating" title={t("hl.ratingTitle")}>
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

                      <div className="hl2-price" title={t("hl.priceNightTitle")}>
                        <span className="hl2-priceNum">{priceText}</span>
                        <span className="hl2-night">{t("hl.perNight")}</span>
                      </div>
                    </div>

                    <h3 className="hl2-name" title={x.title || ""}>
                      {x.title || t("hl.fallbackAlt")}
                    </h3>

                    <div className="hl2-bottomRow">
                      <div className="hl2-meta">
                        <Users size={14} aria-hidden="true" />
                        <span>
                          {t("hl.maxGuests")} <strong>{x.guests ?? "—"}</strong> {t("hl.guests")}
                        </span>
                      </div>

                      <div className="hl2-cta">
                        {t("hl.seeDetails")} <span className="hl2-ctaArrow">→</span>
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
