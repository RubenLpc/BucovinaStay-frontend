// src/components/Stays/StayCard.jsx
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { trackClick, trackImpression } from "../../api/analyticsService";
import { useAuthStore } from "../../stores/authStore";
import { useFavorites } from "../../hooks/useFavorites";

import { Star, MapPin, Users, Heart, ChevronRight, Sparkles } from "lucide-react";

import "./StayCard.css";
import { AMENITY_BY_KEY } from "../../constants/amenitiesCatalog";

const TYPE_LABELS = {
  apartament: "Apartament",
  pensiune: "Pensiune",
  cabana: "Cabană",
  hotel: "Hotel",
  vila: "Vilă",
  tiny_house: "Tiny House",
  studio: "Studio",
};

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

function formatMoney(value, currency = "RON") {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

export default function StayCard({ stay, active = false, onOpen, onHover }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const { isAuthenticated } = useAuthStore();
  const { favIds, toggle: toggleFav } = useFavorites(isAuthenticated);

  const favSet = useMemo(() => {
    if (favIds instanceof Set) return favIds;
    if (Array.isArray(favIds)) return new Set(favIds.map(String));
    return new Set();
  }, [favIds]);

  const id = String(stay?.id || stay?._id || "");
  const isFav = id ? favSet.has(id) : false;

  // impression (dedupe per session)
  useEffect(() => {
    if (!id) return;

    const key = `imp:${id}`;
    if (sessionStorage.getItem(key)) return;

    const el = cardRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        sessionStorage.setItem(key, "1");
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

  const imageUrl = safeImg(stay?.image || stay?.cover || stay?.images?.[0] || "");
  const title = safeText(stay?.title || stay?.name, "Fără titlu");
  const location = safeText(stay?.locality || stay?.city || stay?.location, "—");
  const typeLabel = TYPE_LABELS[stay?.type] || safeText(stay?.type, "—");

  const rating = Number.isFinite(Number(stay?.ratingAvg ?? stay?.rating)) ? Number(stay?.ratingAvg ?? stay?.rating) : 0;
  const reviews = Number.isFinite(Number(stay?.reviewsCount ?? stay?.reviews)) ? Number(stay?.reviewsCount ?? stay?.reviews) : 0;

  const currency = stay?.currency || "RON";
  const priceValue = formatMoney(stay?.pricePerNight, currency);

  const maxGuests = stay?.maxGuests ?? stay?.capacity ?? stay?.guests ?? null;

  const amenityKeys = useMemo(() => {
    const arr = Array.isArray(stay?.amenities) ? stay.amenities : [];
    return arr.slice(0, 2);
  }, [stay]);

  const quickFacts = useMemo(() => {
    const beds = stay?.beds ?? stay?.bedrooms ?? null;
    const baths = stay?.baths ?? stay?.bathrooms ?? null;
    const sqm = stay?.sqm ?? stay?.area ?? null;

    const out = [];
    if (beds != null) out.push({ k: "beds", label: `${beds} paturi` });
    if (baths != null) out.push({ k: "baths", label: `${baths} băi` });
    if (sqm != null) out.push({ k: "sqm", label: `${sqm} m²` });
    return out.slice(0, 3);
  }, [stay]);

  const onToggleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!id) return;

    if (!isAuthenticated) {
      toast.info("Trebuie să fii autentificat", {
        description: "Autentifică-te pentru a salva cazări la favorite.",
      });
      return;
    }

    try {
      await toggleFav(id);
    } catch {
      toast.error("Nu am putut actualiza favoritele.");
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
      aria-label={`Deschide ${title}`}
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
          <div className="stayCardBadges" aria-label="Facilități cheie">
            {amenityKeys.map((k) => {
              const meta = AMENITY_BY_KEY?.[k];
              return (
                <span key={k} className="stayCardBadge" title={meta?.label || k}>
                  {meta?.label || k}
                </span>
              );
            })}
          </div>
        )}

        {/* rating chip */}
        <div className="stayCardRatingChip" title="Rating">
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
          aria-label={isFav ? "Scoate din favorite" : "Adaugă la favorite"}
          title={isFav ? "Scoate din favorite" : "Adaugă la favorite"}
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
          <div className="stayCardGuests" title="Capacitate">
            <Users size={16} />
            <span>
              max <strong>{maxGuests ?? "—"}</strong> oaspeți
            </span>
          </div>

         
        </div>

        <div className="stayCardFooter">
          <div className="stayCardPrice">
            <div className="stayCardPriceLine">
              <span className="stayCardPriceVal">{priceValue}</span>
              <span className="stayCardPriceUnit">/ noapte</span>
            </div>
            <div className="stayCardPriceHint">Preț orientativ • poate varia sezonier</div>
          </div>

          <button
            className="stayCardCta"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              open();
            }}
            aria-label="Vezi detalii"
          >
            Vezi <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
