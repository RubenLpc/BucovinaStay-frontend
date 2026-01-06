import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wifi,
  Car,
  Coffee,
  PawPrint,
  Sparkles,
  CookingPot,
  Snowflake,
  Flame,
  Thermometer,
  MapPin,
  Users,
  Star,
  ChevronRight,
} from "lucide-react";
import "./StayCard.css";

const AMENITY_META = {
  wifi: { label: "Wi-Fi", Icon: Wifi },
  parking: { label: "Parcare", Icon: Car },
  breakfast: { label: "Mic dejun", Icon: Coffee },
  petFriendly: { label: "Pet-friendly", Icon: PawPrint },
  spa: { label: "Spa", Icon: Sparkles },
  kitchen: { label: "Bucătărie", Icon: CookingPot },
  ac: { label: "Aer condiționat", Icon: Snowflake },
  sauna: { label: "Saună", Icon: Thermometer },
  fireplace: { label: "Șemineu", Icon: Flame },
};

const TYPE_LABELS = {
  apartament: "Apartament",
  pensiune: "Pensiune",
  cabana: "Cabană",
  hotel: "Hotel",
  vila: "Vilă",
  tiny_house: "Tiny House",
};

const formatMoney = (value, currency = "RON") => {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(n);
};

function safeText(x, fallback = "—") {
  const s = String(x ?? "").trim();
  return s ? s : fallback;
}

export default function StayCard({ stay }) {
  const navigate = useNavigate();

  const open = () => navigate(`/cazari/${stay?.id}`);

  const imageUrl = stay?.image || "/placeholder-stay.jpg";
  const title = safeText(stay?.name, "Fără titlu");
  const subtitle = safeText(stay?.subtitle, "—");
  const location = safeText(stay?.location, "—");

  const typeLabel = TYPE_LABELS[stay?.type] || safeText(stay?.type, "—");

  const rating = Number.isFinite(stay?.rating) ? stay.rating : 0;
  const reviews = Number.isFinite(stay?.reviews) ? stay.reviews : 0;

  const currency = stay?.currency || "RON";
  const price = formatMoney(stay?.pricePerNight, currency);

  const maxGuests = stay?.maxGuests ?? stay?.capacity ?? null;

  const amenityKeys = useMemo(() => {
    const arr = Array.isArray(stay?.amenities) ? stay.amenities : [];
    // max 5 pentru horizontal
    return arr.slice(0, 5);
  }, [stay]);

  const badges = useMemo(() => {
    const arr = Array.isArray(stay?.badges) ? stay.badges : [];
    return arr.slice(0, 2);
  }, [stay]);

  return (
    <article
      className="stayCardH"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") open();
      }}
      aria-label={`Deschide ${title}`}
    >
      {/* LEFT: image */}
      <div className="stayMedia">
        <img className="stayImg" src={imageUrl} alt={title} loading="lazy" />

        <div className="stayMediaOverlay" aria-hidden="true" />

        {!!badges.length && (
          <div className="stayBadges">
            {badges.map((b) => (
              <span className="stayBadge" key={b}>
                {b}
              </span>
            ))}
          </div>
        )}

        {/* rating pill on image (optional, looks premium) */}
        <div className="stayRatingPill" title="Rating">
          <Star size={14} />
          <span className="stayRatingNum">{rating.toFixed(1)}</span>
          <span className="stayRatingCount">({reviews})</span>
        </div>
      </div>

      {/* RIGHT: content */}
      <div className="stayContent">
        <div className="stayHeader">
          <div className="stayTitleBlock">
            <h3 className="stayTitle" title={title}>
              {title}
            </h3>

            <div className="staySubRow">
              <span className="staySubtitle" title={subtitle}>
                {subtitle}
              </span>
              <span className="staySep">•</span>
              <span className="stayLoc" title={location}>
                <MapPin size={14} />
                {location}
              </span>
            </div>
          </div>

          <div className="stayTypePill" title={typeLabel}>
            {typeLabel}
          </div>
        </div>

        <div className="stayMetaRow">
          <div className="stayMetaItem" title="Capacitate">
            <Users size={16} />
            <span>
              max <strong>{maxGuests ?? "—"}</strong>
            </span>
          </div>

          <div className="stayAmenityRow" aria-label="Facilități">
            {amenityKeys.length ? (
              amenityKeys.map((k) => {
                const meta = AMENITY_META[k] || { label: k, Icon: Sparkles };
                const Icon = meta.Icon;
                return (
                  <span key={k} className="amenityChip" title={meta.label}>
                    <Icon size={14} />
                    <span className="amenityLbl">{meta.label}</span>
                  </span>
                );
              })
            ) : (
              <span className="amenityChip isMuted" title="Facilități necompletate">
                <Sparkles size={14} />
                <span className="amenityLbl">Fără facilități</span>
              </span>
            )}
          </div>
        </div>

        <div className="stayFooter">
          <div className="stayPrice">
            <div className="stayPriceTop">
              <span className="stayPriceValue">{price}</span>
              <span className="stayPriceUnit">/ noapte</span>
            </div>
            <div className="stayPriceHint">Preț orientativ • taxe incluse (dacă e cazul)</div>
          </div>

          <button
  className="stayCta stayCtaGlass"
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    open();
  }}
>
  Vezi detalii <ChevronRight size={18} />
</button>

        </div>
      </div>
    </article>
  );
}
