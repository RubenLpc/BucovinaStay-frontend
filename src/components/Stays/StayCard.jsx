// src/components/Stays/StayCard.jsx
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { trackClick, trackImpression } from "../../api/analyticsService";
import { useAuthStore } from "../../stores/authStore";
import { useFavorites } from "../../hooks/useFavorites";

import { Star, MapPin, Users, Heart, ChevronRight } from "lucide-react";

import "./StayCard.css";
import { AMENITY_BY_KEY } from "../../constants/amenitiesCatalog";
import { useTranslation } from "react-i18next";

const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop stop-color="#eef2ff"/>
        <stop offset="1" stop-color="#f8fafc"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      font-family="Arial" font-size="34" fill="#64748b">BucovinaStay</text>
  </svg>
`);

function safeText(x, fallback = "—") {
  const s = String(x ?? "").trim();
  return s ? s : fallback;
}

function safeImg(src) {
  if (!src || typeof src !== "string") return FALLBACK_IMG;
  if (!src.startsWith("http") && !src.startsWith("data:") && !src.startsWith("/")) return FALLBACK_IMG;
  return src;
}

export default function StayCard({ stay, active = false, onOpen, onHover }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";

  const navigate = useNavigate();
  const cardRef = useRef(null);

  const { isAuthenticated } = useAuthStore();
  const { favIds, toggle: toggleFav } = useFavorites(isAuthenticated);

  const favSet = useMemo(() => {
    if (favIds instanceof Set) return favIds;
    if (Array.isArray(favIds)) return new Set(favIds.map(String));
    return new Set();
  }, [favIds]);

  const id = String(stay?.id || stay?._id || "").trim();
  const isFav = id ? favSet.has(id) : false;

  const imageUrl = safeImg(stay?.image || stay?.cover || stay?.images?.[0] || "");
  const title = safeText(stay?.title || stay?.name, t("stayCard.noTitle"));
  const location = safeText(stay?.locality || stay?.city || stay?.location, "—");

  const typeKey = stay?.type ? String(stay.type) : "";
  const typeLabel = typeKey
    ? (t(`stayCard.type.${typeKey}`, { defaultValue: "" }) || safeText(typeKey, "—"))
    : "—";

  const ratingNumRaw = Number(stay?.ratingAvg ?? stay?.rating);
  const rating = Number.isFinite(ratingNumRaw) ? ratingNumRaw : 0;

  const reviewsNumRaw = Number(stay?.reviewsCount ?? stay?.reviews);
  const reviews = Number.isFinite(reviewsNumRaw) ? reviewsNumRaw : 0;

  const currency = stay?.currency || "RON";

  const priceValue = useMemo(() => {
    const n = Number(stay?.pricePerNight ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "—";
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n} ${currency}`;
    }
  }, [stay?.pricePerNight, currency, locale]);

  const maxGuests = stay?.maxGuests ?? stay?.capacity ?? stay?.guests ?? null;

  const amenityKeys = useMemo(() => {
    const arr = Array.isArray(stay?.amenities) ? stay.amenities : [];
    return arr.slice(0, 2);
  }, [stay]);

  // quick facts (păstrat chiar dacă încă nu-l afișezi; rămâne pregătit)
  const quickFacts = useMemo(() => {
    const beds = stay?.beds ?? stay?.bedrooms ?? null;
    const baths = stay?.baths ?? stay?.bathrooms ?? null;
    const sqm = stay?.sqm ?? stay?.area ?? null;

    const out = [];
    if (beds != null) out.push({ k: "beds", label: t("stayCard.facts.beds", { count: beds }) });
    if (baths != null) out.push({ k: "baths", label: t("stayCard.facts.baths", { count: baths }) });
    if (sqm != null) out.push({ k: "sqm", label: t("stayCard.facts.sqm", { count: sqm }) });
    return out.slice(0, 3);
  }, [stay, t]);

  // impression (dedupe per session)
  useEffect(() => {
    if (!id) return;

    let already = false;
    try {
      const key = `imp:${id}`;
      if (sessionStorage.getItem(key)) already = true;
    } catch {
      // ignore (private mode / quota)
    }
    if (already) return;

    const el = cardRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;

        try {
          sessionStorage.setItem(`imp:${id}`, "1");
        } catch {
          // ignore
        }

        trackImpression([id]);
        obs.disconnect();
      },
      { threshold: 0.55 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [id]);

  const open = () => {
    if (id) trackClick(id, "open");
    if (onOpen) onOpen();
    else navigate(`/cazari/${id}`);
  };

  const onToggleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id) return;

    if (!isAuthenticated) {
      toast.info(t("toasts.authRequired"), { description: t("toasts.authRequiredDesc") });
      return;
    }

    try {
      await toggleFav(id);
    } catch {
      toast.error(t("toasts.favUpdateFailed"));
    }
  };

  return (
    <article
      ref={cardRef}
      className={`stayCardPro ${active ? "isActive" : ""}`}
      role="button"
      tabIndex={0}
      onMouseEnter={() => onHover?.()}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      aria-label={t("stayCard.open", { title })}
    >
      {/* Media */}
      <div className="stayCardMedia">
        <img
          className="stayCardImg"
          src={imageUrl}
          alt={title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMG;
          }}
        />
        <div className="stayCardShade" aria-hidden="true" />

        {/* top-left badges */}
        {!!amenityKeys.length && (
          <div className="stayCardBadges" aria-label={t("stayCard.keyAmenities")}>
            {amenityKeys.map((k) => {
              const meta = AMENITY_BY_KEY?.[k];
              const label = meta?.labelKey ? t(meta.labelKey) : meta?.label || k;
              return (
                <span key={k} className="stayCardBadge" title={label}>
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* rating chip */}
        <div className="stayCardRatingChip" title={t("stayCard.rating")}>
          <Star size={14} />
          <span className="stayCardRatingNum">{rating ? rating.toFixed(1) : "—"}</span>
          {reviews ? <span className="stayCardRatingCount">({reviews})</span> : null}
        </div>

        {/* favorite */}
        <button
          className={`stayCardFav ${isFav ? "isOn" : ""} ${!isAuthenticated ? "locked" : ""}`}
          type="button"
          onClick={onToggleFav}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={isFav ? t("stayCard.removeFav") : t("stayCard.addFav")}
          title={isFav ? t("stayCard.removeFav") : t("stayCard.addFav")}
        >
          <Heart size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="stayCardBody">
        <div className="stayCardTopRow">
          <div className="stayCardTitleWrap">
            <div className="stayCardTitle" title={title}>
              {title}
            </div>

            <div className="stayCardSub">
              <span className="stayCardLoc" title={location}>
                <MapPin size={14} />
                {location}
              </span>
              <span className="stayCardDot">•</span>
              <span className="stayCardType" title={typeLabel}>
                {typeLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="stayCardMidRow">
          <div className="stayCardGuests" title={t("stayCard.capacity")}>
            <Users size={16} />
            <span>
              {maxGuests != null ? t("stayCard.maxGuests", { count: maxGuests }) : "—"}
            </span>
          </div>

          {/* Dacă vrei să le afișezi, ai deja quickFacts gata:
              <div className="stayCardFacts">
                {quickFacts.map(f => <span key={f.k} className="stayCardFact">{f.label}</span>)}
              </div>
          */}
        </div>

        <div className="stayCardFooter">
          <div className="stayCardPrice">
            <div className="stayCardPriceLine">
              <span className="stayCardPriceVal">{priceValue}</span>
              <span className="stayCardPriceUnit">{t("stayCard.night")}</span>
            </div>
            <div className="stayCardPriceHint">{t("stayCard.priceHint")}</div>
          </div>

          <button
            className="stayCardCta"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              open();
            }}
            aria-label={t("stayCard.seeDetails")}
          >
            {t("stayCard.see")} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
