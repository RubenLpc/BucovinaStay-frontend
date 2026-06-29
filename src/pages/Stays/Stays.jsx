import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./Stays.css";
import { listStays } from "../../api/staysService";
import StayCard from "../../components/Stays/StayCard";
import { useAuthStore } from "../../stores/authStore";
import { useFavorites } from "../../hooks/useFavorites";
import { toast } from "sonner";
import wifiIcon from "../../assets/wifi.png";
import toiletIcon from "../../assets/toilet.png";
import parkingIcon from "../../assets/parking.png";
import petIcon from "../../assets/pet.png";
import {
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Heart,
  ChevronDown,
} from "lucide-react";
import { AMENITY_BY_KEY } from "../../constants/amenitiesCatalog";
import { PROPERTY_TYPES } from "../../constants/propertyTypes";
import { useTranslation } from "react-i18next";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const PAGE_SIZE = 9;
const MOBILE_BREAKPOINT = 860;
const FIXED_RECOMMENDED_AMENITY_KEYS = ["wifi", "parking", "petFriendly", "washer"];
const FEATURED_AMENITY_IMAGES = {
  wifi: wifiIcon,
  parking: parkingIcon,
  petFriendly: petIcon,
  washer: toiletIcon,
};
// ---------- helpers URL ----------
function setParam(sp, key, val) {
  if (val == null || val === "" || val === "all") sp.delete(key);
  else sp.set(key, String(val));
}
function parseNum(x, fallback) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
// bounds string: "swLat,swLng,neLat,neLng"
function encodeBoundsFromMapbox(b) {
  if (!b) return "";
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  return `${sw.lat.toFixed(6)},${sw.lng.toFixed(6)},${ne.lat.toFixed(6)},${ne.lng.toFixed(6)}`;
}
function decodeBounds(s) {
  if (!s) return null;
  const parts = String(s).split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [swLat, swLng, neLat, neLng] = parts;
  return { swLat, swLng, neLat, neLng };
}
function boundsToParams(boundsStr) {
  const b = decodeBounds(boundsStr);
  if (!b) return null;
  return {
    swLat: String(b.swLat),
    swLng: String(b.swLng),
    neLat: String(b.neLat),
    neLng: String(b.neLng),
  };
}
export default function Stays() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  // --- token
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
  const { isAuthenticated } = useAuthStore();
  const { favIds, toggle: toggleFav } = useFavorites(isAuthenticated);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");
  const [type, setType] = useState(searchParams.get("type") || "all");
  // 🔥 price filters
  const urlMinPrice = searchParams.get("priceMin");
  const urlMaxPrice = searchParams.get("priceMax");
  const [minPrice, setMinPrice] = useState(urlMinPrice != null ? parseNum(urlMinPrice, 0) : null);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice != null ? parseNum(urlMaxPrice, 0) : null);
  const [capacityMin, setCapacityMin] = useState(parseNum(searchParams.get("capacityMin"), 0));
  const [minRating, setMinRating] = useState(parseNum(searchParams.get("minRating"), 0));
  const [amenities, setAmenities] = useState(() => {
    const csv = searchParams.get("facilities") || "";
    const s = new Set(csv.split(",").map((x) => x.trim()).filter(Boolean));
    return s;
  });
  const [currency, setCurrency] = useState(searchParams.get("currency") || "RON");
  // 🔥 price range inteligent (derivat din rezultate)
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0, step: 10 });
  // draft sliders
  const [minPriceDraft, setMinPriceDraft] = useState(null);
  const [maxPriceDraft, setMaxPriceDraft] = useState(null);
  // layout state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [page, setPage] = useState(parseNum(searchParams.get("page"), 1));
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  // Map state (area search)
  const [boundsCommitted, setBoundsCommitted] = useState(searchParams.get("bounds") || "");
  const [boundsDirtyStr, setBoundsDirtyStr] = useState("");
  const areaSearchDebounceRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [popupId, setPopupId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false));
  const [mobileSheetState, setMobileSheetState] = useState("collapsed");
  const [searchOpen, setSearchOpen] = useState(() => Boolean(searchParams.get("q")));
  const sheetDragRef = useRef(null);
  const suppressBoundsSyncUntilRef = useRef(0);
  const openPopup = (id) => {
    setPopupId(id);
    setActiveId(id);
  };
  const closePopup = () => {
    setPopupId(null);
    setActiveId(null);
  };
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (!searchOpen) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 140);
    return () => window.clearTimeout(id);
  }, [searchOpen]);
  const qDebounceRef = useRef(null);
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    clearTimeout(qDebounceRef.current);
    qDebounceRef.current = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(qDebounceRef.current);
  }, [q]);
  // Reset page when committed filters change
  useEffect(() => {
    setPage(1);
  }, [qDebounced, sort, type, minPrice, maxPrice, capacityMin, minRating, amenities, boundsCommitted, currency]);
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    setParam(sp, "q", qDebounced.trim() ? qDebounced.trim() : "");
    setParam(sp, "sort", sort !== "recommended" ? sort : "");
    setParam(sp, "type", type !== "all" ? type : "");
    setParam(sp, "priceMin", minPrice != null ? String(minPrice) : "");
    setParam(sp, "priceMax", maxPrice != null ? String(maxPrice) : "");
    setParam(sp, "capacityMin", capacityMin > 0 ? capacityMin : "");
    setParam(sp, "minRating", minRating > 0 ? minRating : "");
    const fac = amenities.size ? Array.from(amenities).join(",") : "";
    setParam(sp, "facilities", fac);
    setParam(sp, "currency", currency !== "RON" ? currency : "");
    setParam(sp, "bounds", boundsCommitted || "");
    setParam(sp, "page", page > 1 ? page : "");
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, sort, type, minPrice, maxPrice, capacityMin, minRating, amenities, boundsCommitted, page, currency]);
  // Format price label (locale-aware)
  function moneyLabel(value, ccy = "RON") {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "—";
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n} ${ccy}`;
    }
  }
  // Fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const params = {
          page: String(page),
          limit: String(PAGE_SIZE),
          sort,
          currency,
        };
        if (qDebounced.trim()) params.q = qDebounced.trim();
        if (type !== "all") params.type = type;
        if (minPrice != null) params.priceMin = String(minPrice);
        if (maxPrice != null) params.priceMax = String(maxPrice);
        if (capacityMin > 0) params.capacityMin = String(capacityMin);
        if (minRating > 0) params.minRating = String(minRating);
        if (amenities.size > 0) params.facilities = Array.from(amenities).join(",");
        const bParams = boundsToParams(boundsCommitted);
        if (bParams) Object.assign(params, bParams);
        const data = await listStays(params);
        if (!alive) return;
        setResults(data.items || []);
        setTotal(data.total ?? 0);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Error");
        setResults([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [qDebounced, sort, type, minPrice, maxPrice, capacityMin, minRating, amenities, page, boundsCommitted, currency]);
  // 🔥 Price bounds inteligente din rezultate
  useEffect(() => {
    const arr = Array.isArray(results) ? results : [];
    const prices = arr
      .map((x) => x?.pricePerNight)
      .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    if (!prices.length) {
      const sliderMax = currency === "EUR" ? 600 : 2400;
      setPriceBounds({ min: 0, max: sliderMax, step: 1, sliderMin: 0, sliderMax });
      setMinPriceDraft((p) => (p == null ? 0 : p));
      setMaxPriceDraft((p) => (p == null ? sliderMax : p));
      return;
    }
    const pHigh = prices[Math.floor((prices.length - 1) * 0.98)];
    const rawMax = Math.max(1, pHigh);
    // slider starts at 0 și se termină cu ~15% padding peste p98
    const sliderMin = 0;
    const sliderMax = Math.ceil(rawMax * 1.15);
    const niceMin = Math.max(0, prices[0]);
    const niceMax = rawMax;
    setPriceBounds({ min: niceMin, max: niceMax, step: 1, sliderMin, sliderMax });
    setMinPriceDraft((prev) => (prev == null ? sliderMin : clamp(prev, sliderMin, sliderMax)));
    setMaxPriceDraft((prev) => (prev == null ? sliderMax : clamp(prev, sliderMin, sliderMax)));
    if (minPrice != null) setMinPrice((p) => clamp(p, sliderMin, sliderMax));
    if (maxPrice != null) setMaxPrice((p) => clamp(p, sliderMin, sliderMax));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, currency]);
  // dacă schimbi moneda, reset preț aplicat
  useEffect(() => {
    setMinPrice(null);
    setMaxPrice(null);
    setMinPriceDraft(null);
    setMaxPriceDraft(null);
  }, [currency]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const toggleAmenity = (key) => {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const clearFilters = () => {
    setType("all");
    setMinPrice(null);
    setMaxPrice(null);
    setMinPriceDraft(priceBounds.sliderMin ?? priceBounds.min);
    setMaxPriceDraft(priceBounds.sliderMax ?? priceBounds.max);
    setCapacityMin(0);
    setMinRating(0);
    setAmenities(new Set());
    setBoundsCommitted("");
    setBoundsDirtyStr("");
  };
  const openStay = (stay) => {
    const id = stay?.id || stay?._id;
    if (!id) return;
    navigate(`/cazari/${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // items with coords
  const mapItems = useMemo(() => {
    const arr = Array.isArray(results) ? results : [];
    return arr
      .map((s) => ({ ...s, id: s.id || s._id }))
      .filter((s) => Array.isArray(s?.geo?.coordinates) && s.geo.coordinates.length === 2);
  }, [results]);
  const defaultCenter = useMemo(() => ({ latitude: 47.65, longitude: 25.55, zoom: 8.6 }), []);
  const selectedStay = useMemo(() => {
    const selectedId = popupId || activeId;
    if (!selectedId) return null;
    return results.find((s) => (s.id || s._id) === selectedId) || mapItems.find((s) => s.id === selectedId) || null;
  }, [activeId, popupId, results, mapItems]);
  useEffect(() => {
    if (!isMobile) {
      setMobileSheetState("collapsed");
      return;
    }
    if (popupId) {
      setMobileSheetState((prev) => (prev === "list" ? prev : "peek"));
      return;
    }
    setMobileSheetState((prev) => (prev === "peek" ? "collapsed" : prev));
  }, [isMobile, popupId]);
  // Map handlers
  const onMapIdle = () => {
    const m = mapRef.current?.getMap?.();
    if (!m) return;
    if (Date.now() < suppressBoundsSyncUntilRef.current) return;
    const b = m.getBounds?.();
    const enc = encodeBoundsFromMapbox(b);
    if (!enc) return;
    if (enc !== boundsCommitted) {
      setBoundsDirtyStr(enc);
    }
  };
  useEffect(() => {
    if (!boundsDirtyStr || boundsDirtyStr === boundsCommitted) return undefined;
    clearTimeout(areaSearchDebounceRef.current);
    areaSearchDebounceRef.current = setTimeout(() => {
      setBoundsCommitted(boundsDirtyStr);
    }, 500);
    return () => clearTimeout(areaSearchDebounceRef.current);
  }, [boundsDirtyStr, boundsCommitted]);
  const syncHoverToMap = (stay) => {
    const id = stay?.id || stay?._id;
    if (!id) return;
    setActiveId(id);
  };
  const beginSheetDrag = (e) => {
    if (!isMobile) return;
    sheetDragRef.current = { startY: e.clientY };
  };
  const endSheetDrag = (e) => {
    const drag = sheetDragRef.current;
    sheetDragRef.current = null;
    if (!drag) return;
    const deltaY = e.clientY - drag.startY;
    if (deltaY <= -40) {
      setMobileSheetState((prev) => {
        if (prev === "collapsed") return "list";
        if (prev === "peek") return "list";
        return prev;
      });
      return;
    }
    if (deltaY >= 40) {
      setMobileSheetState((prev) => {
        if (prev === "list") return popupId ? "peek" : "collapsed";
        if (prev === "peek") return "collapsed";
        return prev;
      });
    }
  };
  const toggleSheetLevel = () => {
    setMobileSheetState((prev) => {
      if (prev === "collapsed") return popupId ? "peek" : "list";
      if (prev === "peek") return "list";
      return popupId ? "peek" : "collapsed";
    });
  };
  const typeLabel = (typeKey) => {
    if (!typeKey || typeKey === "all") return t("stays.allTypes");
    const meta = PROPERTY_TYPES?.find?.((x) => x.key === typeKey);
    if (!meta) return typeKey;
    return meta.labelKey ? t(meta.labelKey) : meta.label || typeKey;
  };
  const amenityLabel = (k) => {
    const meta = AMENITY_BY_KEY?.[k];
    if (!meta) return k;
    return meta.labelKey ? t(meta.labelKey) : meta.label || k;
  };
  // chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (type !== "all") {
      chips.push({ key: "type", label: typeLabel(type), onX: () => setType("all") });
    }
    if (minPrice != null || maxPrice != null) {
      const both = minPrice != null && maxPrice != null;
      const onlyMin = minPrice != null && maxPrice == null;
      const betweenWord = locale === "ro-RO" ? "Între" : "Between";
      const andWord = locale === "ro-RO" ? "și" : "and";
      const label = both
        ? `${betweenWord} ${moneyLabel(minPrice, currency)} ${andWord} ${moneyLabel(maxPrice, currency)}`
        : onlyMin
          ? t("stays.chips.minPrice", { value: moneyLabel(minPrice, currency) })
          : t("stays.chips.maxPrice", { value: moneyLabel(maxPrice, currency) });
      chips.push({
        key: "price",
        label,
        onX: () => {
          setMinPrice(null);
          setMaxPrice(null);
          setMinPriceDraft(priceBounds.sliderMin ?? priceBounds.min);
          setMaxPriceDraft(priceBounds.sliderMax ?? priceBounds.max);
        },
      });
    }
    if (minRating > 0) {
      chips.push({
        key: "rating",
        label: `${minRating.toFixed(1)}+`,
        onX: () => {
          setMinRating(0);
                  },
      });
    }
    if (capacityMin > 0) {
      chips.push({
        key: "capacity",
        label: t("stays.chips.capacity", { count: capacityMin }),
        onX: () => setCapacityMin(0),
      });
    }
    if (currency && currency !== "RON") {
      chips.push({ key: "currency", label: currency, onX: () => setCurrency("RON") });
    }
    if (amenities.size) {
      Array.from(amenities)
        .slice(0, 3)
        .forEach((k) => {
          chips.push({ key: `a:${k}`, label: amenityLabel(k), onX: () => toggleAmenity(k) });
        });
      if (amenities.size > 3) {
        chips.push({
          key: "more",
          label: t("stays.chips.more", { count: amenities.size - 3 }),
          onX: () => setFiltersOpen(true),
        });
      }
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, minPrice, maxPrice, capacityMin, minRating, amenities, currency, priceBounds.sliderMin, priceBounds.sliderMax, locale, t]);
  const visibleAmenities = useMemo(() => {
    const featuredSet = new Set(["wifi", "parking", "petFriendly", "washer"]);
    const all = Object.values(AMENITY_BY_KEY).filter((a) => !featuredSet.has(a.key));
    return showAllAmenities ? all : all.slice(0, 18);
  }, [showAllAmenities]);
  const featuredAmenities = useMemo(() => {
    return FIXED_RECOMMENDED_AMENITY_KEYS
      .map((key) => AMENITY_BY_KEY[key])
      .filter(Boolean);
  }, []);
  const priceHistogram = useMemo(() => {
    const N = 34;
    const sMin = priceBounds.sliderMin ?? priceBounds.min;
    const sMax = priceBounds.sliderMax ?? priceBounds.max;
    const prices = results
      .map((x) => x?.pricePerNight)
      .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
    if (!prices.length || sMax <= sMin) return Array(N).fill(4);
    const bucketSize = (sMax - sMin) / N;
    const counts = Array(N).fill(0);
    prices.forEach((p) => {
      const i = Math.min(N - 1, Math.floor((p - sMin) / bucketSize));
      if (i >= 0) counts[i]++;
    });
    const maxCount = Math.max(...counts, 1);
    return counts.map((c) => Math.max(4, Math.round((c / maxCount) * 62)));
  }, [results, priceBounds.sliderMin, priceBounds.sliderMax]);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (type !== "all") count += 1;
    if (minPrice != null || maxPrice != null) count += 1;
    if (capacityMin > 0) count += 1;
    if (minRating > 0) count += 1;
    if (currency !== "RON") count += 1;
    if (amenities.size > 0) count += 1;
    if (boundsCommitted) count += 1;
    return count;
  }, [type, minPrice, maxPrice, capacityMin, minRating, currency, amenities, boundsCommitted]);
  const handleToggleFav = async (id) => {
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
  const renderSelectedStayCard = (stay, variant = "desktop") => {
    if (!stay) return null;
    const id = stay.id || stay._id;
    const title = stay.title || stay.name || (locale === "ro-RO" ? "Cazare" : "Stay");
    const loc = stay.locality || stay.city || stay.location || "—";
    const img = stay.image || stay.coverImage?.url || stay.images?.[0]?.url || "";
    const ccy = stay.currency || currency || "RON";
    const price = moneyLabel(stay.pricePerNight, ccy);
    const rating = Number(stay.ratingAvg ?? stay.rating ?? 0);
    const reviews = Number(stay.reviewsCount ?? stay.reviews ?? 0);
    const isFav = favIds?.has?.(id);
    return (
      <article className={`staysFeatureCard staysFeatureCard--${variant}`} onClick={() => openStay(stay)}>
        <div className="staysFeatureMedia">
          {img ? <img src={img} alt={title} loading="lazy" /> : <div className="staysFeatureImgPh" />}
          <div className="staysFeatureActions">
            <button
              type="button"
              className={`staysFeatureAction ${isFav ? "active" : ""} ${!isAuthenticated ? "locked" : ""}`}
              aria-label={isFav ? (locale === "ro-RO" ? "Scoate din favorite" : "Remove from favorites") : (locale === "ro-RO" ? "Adaugă la favorite" : "Add to favorites")}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFav(id);
              }}
            >
              <Heart size={18} />
            </button>
            <button
              type="button"
              className="staysFeatureAction"
              aria-label={t("stays.drawerClose")}
              onClick={(e) => {
                e.stopPropagation();
                closePopup();
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="staysFeatureBody">
          <div className="staysFeatureTop">
            <div className="staysFeatureTitle">{title}</div>
            {rating > 0 ? (
              <div className="staysFeatureRating">
                <span>★</span>
                <span>{rating.toFixed(1)}</span>
                {reviews > 0 ? <span>({reviews})</span> : null}
              </div>
            ) : null}
          </div>
          <div className="staysFeatureSub">{loc}</div>
          <div className="staysFeaturePrice">{price}</div>
        </div>
      </article>
    );
  };
  const propertyTypeOptions = useMemo(() => {
    const items = [
      { key: "all", label: t("stays.allTypes") },
      ...PROPERTY_TYPES.map(({ key, labelKey, label }) => ({
        key,
        label: labelKey ? t(labelKey) : label || key,
      })),
    ];
    const rows = [];
    for (let i = 0; i < items.length; i += 4) rows.push(items.slice(i, i + 4));
    return rows;
  }, [t]);
  const activeRatingBtn = [0, 3, 4, 4.5].reduce((best, opt) => opt <= minRating ? opt : best, 0);
  const sMin = priceBounds.sliderMin ?? priceBounds.min;
  const sMax = priceBounds.sliderMax ?? priceBounds.max;
  const Filters = (
    <aside className="staysFiltersCard staysFiltersCardV2">
      {activeChips.length ? (
        <div className="staysFilterBlock staysFilterBlockSelected">
          <div className="staysLabel">{t("stays.selectedFilters")}</div>
          <div className="staysSelectedRow">
            {activeChips.map((c) => (
              <button key={c.key} type="button" className="staysSelectedChip" onClick={c.onX}>
                <span>{c.label}</span>
                <X size={14} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.recommendedForYou")}</div>
        <div className="staysFeaturedAmenityGrid">
          {featuredAmenities.map((a) => {
            const Icon = a.icon || Sparkles;
            const on = amenities.has(a.key);
            const label = a.labelKey ? t(a.labelKey) : a.label || a.key;
            const imageSrc = FEATURED_AMENITY_IMAGES[a.key];
            return (
              <button
                key={a.key}
                type="button"
                className={`staysFeaturedAmenity ${on ? "isOn" : ""}`}
                onClick={() => toggleAmenity(a.key)}
                title={label}
              >
                <div className="staysFeaturedAmenityIcon">
                  {imageSrc ? <img src={imageSrc} alt="" className="staysFeaturedAmenityImg" /> : <Icon size={44} />}
                </div>
                <div className="staysFeaturedAmenityLabel">{label}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.propertyType")}</div>
        <div className="staysTypeRows">
          {propertyTypeOptions.map((row, rowIdx) => (
            <div key={rowIdx} className="staysTypeRow">
              {row.map((option) => {
                const isOn = type === option.key || (option.key === "all" && type === "all");
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`staysTypeRowBtn ${isOn ? "isOn" : ""}`}
                    onClick={() => setType(option.key === "all" ? "all" : option.key)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.guests")}</div>
        <div className="staysCounterRow">
          <span className="staysCounterCopyLabel">
            {capacityMin === 0 ? t("stays.guestAny") : t("stays.chips.capacity", { count: capacityMin })}
          </span>
          <div className="staysCounterControls">
            <button
              type="button"
              className="staysCounterBtn"
              onClick={() => setCapacityMin((prev) => Math.max(0, prev - 1))}
              disabled={capacityMin === 0}
              aria-label={t("stays.decreaseGuests")}
            >
              −
            </button>
            <div className="staysCounterValue">
              {capacityMin === 0
                ? <span className="staysCounterValueAny">{t("stays.any")}</span>
                : capacityMin}
            </div>
            <button
              type="button"
              className="staysCounterBtn"
              onClick={() => setCapacityMin((prev) => Math.min(16, prev + 1))}
              aria-label={t("stays.increaseGuests")}
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className="staysFilterBlock">
        <div className="staysRowBetween">
          <div>
            <div className="staysLabel staysLabelNoGap">{t("stays.pricePerNight")}</div>
            <div className="staysFiltersMicrocopy">{t("stays.priceHintModal")}</div>
          </div>
          <div className="staysInlineSelect">
            <span className="staysTiny">{t("stays.currency")}</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label={t("stays.currency")}>
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <div className="staysPriceChartWrap" aria-hidden="true">
          <div className="staysPriceBars">
            {priceHistogram.map((heightPx, idx) => {
              const frac = idx / priceHistogram.length;
              const fracNext = (idx + 1) / priceHistogram.length;
              const bucketMin = sMin + frac * (sMax - sMin);
              const bucketMax = sMin + fracNext * (sMax - sMin);
              const selMin = minPriceDraft ?? sMin;
              const selMax = maxPriceDraft ?? sMax;
              const isActive = selMin <= bucketMax && selMax >= bucketMin;
              return <span key={idx} className={`staysPriceBar ${isActive ? "isActive" : ""}`} style={{ height: `${heightPx}px` }} />;
            })}
          </div>
        </div>
        <div className="staysPriceSlider">
          <div className="staysPriceSliderTrack">
            <div
              className="staysPriceSliderFill"
              style={{
                left: `${(((minPriceDraft ?? sMin) - sMin) / Math.max(1, sMax - sMin)) * 100}%`,
                right: `${((sMax - (maxPriceDraft ?? sMax)) / Math.max(1, sMax - sMin)) * 100}%`,
              }}
            />
          </div>
          <input
            className="staysPriceSliderInput"
            type="range"
            min={sMin}
            max={sMax}
            step={1}
            value={minPriceDraft ?? sMin}
            style={{ zIndex: (minPriceDraft ?? sMin) >= sMax - 1 ? 5 : 3 }}
            onChange={(e) => {
              const v = clamp(parseInt(e.target.value, 10), sMin, maxPriceDraft ?? sMax);
              setMinPriceDraft(v);
            }}
            onMouseUp={() => { const v = minPriceDraft ?? sMin; setMinPrice(v <= sMin ? null : v); }}
            onTouchEnd={() => { const v = minPriceDraft ?? sMin; setMinPrice(v <= sMin ? null : v); }}
          />
          <input
            className="staysPriceSliderInput"
            type="range"
            min={sMin}
            max={sMax}
            step={1}
            value={maxPriceDraft ?? sMax}
            style={{ zIndex: 4 }}
            onChange={(e) => {
              const v = clamp(parseInt(e.target.value, 10), minPriceDraft ?? sMin, sMax);
              setMaxPriceDraft(v);
            }}
            onMouseUp={() => { const v = maxPriceDraft ?? sMax; setMaxPrice(v >= sMax ? null : v); }}
            onTouchEnd={() => { const v = maxPriceDraft ?? sMax; setMaxPrice(v >= sMax ? null : v); }}
          />
        </div>
        <div className="staysPriceInputs">
          <div className="staysPriceInputPill">
            <span className="staysTiny">{t("stays.min")}</span>
            <strong>{moneyLabel(minPriceDraft ?? sMin, currency)}</strong>
          </div>
          <div className="staysPriceInputPill">
            <span className="staysTiny">{t("stays.max")}</span>
            <strong>{moneyLabel(maxPriceDraft ?? sMax, currency)}</strong>
          </div>
        </div>
        {(minPrice != null || maxPrice != null) && (
          <button
            className="staysGhostBtn"
            type="button"
            onClick={() => {
              setMinPrice(null);
              setMaxPrice(null);
              setMinPriceDraft(priceBounds.sliderMin ?? priceBounds.min);
              setMaxPriceDraft(priceBounds.sliderMax ?? priceBounds.max);
            }}
          >
            <X size={16} /> {t("stays.resetPrice")}
          </button>
        )}
      </div>
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.minScore")}</div>
        <div className="staysTypeRow">
          {[
            { value: 0, label: t("stays.allTypes") },
            { value: 3, label: "3+ ★" },
            { value: 4, label: "4+ ★" },
            { value: 4.5, label: "4.5+ ★" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`staysTypeRowBtn ${activeRatingBtn === value ? "isOn" : ""}`}
              onClick={() => setMinRating(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.amenities")}</div>
        <div className="staysAmenityGrid staysAmenityGridComfort">
          {visibleAmenities.map((a) => {
            const Icon = a.icon || Sparkles;
            const on = amenities.has(a.key);
            const label = a.labelKey ? t(a.labelKey) : a.label || a.key;
            return (
              <button
                key={a.key}
                type="button"
                className={`staysAmenityChip staysAmenityChipWide ${on ? "isOn" : ""}`}
                onClick={() => toggleAmenity(a.key)}
                title={label}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        {(() => {
          const nonFeaturedTotal = Object.values(AMENITY_BY_KEY).filter((a) => !new Set(FIXED_RECOMMENDED_AMENITY_KEYS).has(a.key)).length;
          return nonFeaturedTotal > 18 ? (
            <button className="staysShowMoreBtn" type="button" onClick={() => setShowAllAmenities((v) => !v)}>
              <span>{showAllAmenities ? t("stays.showLessAmenities") : t("stays.showMoreAmenities", { count: nonFeaturedTotal - 18 })}</span>
              <ChevronDown size={18} className={showAllAmenities ? "isOpen" : ""} />
            </button>
          ) : null;
        })()}
      </div>
      {boundsCommitted ? (
        <div className="staysFilterBlock">
          <div className="staysLabel">{t("stays.mapArea")}</div>
          <button className="staysGhostBtn" type="button" style={{ marginTop: 0 }} onClick={() => setBoundsCommitted("")}>
            <X size={16} /> {t("stays.resetArea")}
          </button>
        </div>
      ) : null}
    </aside>
  );
  return (
    <div className={`staysMapLayout ${filtersOpen ? "filtersOpen" : ""} ${isMobile ? "isMobileMap" : ""} sheet-${mobileSheetState} ${searchOpen ? "searchOpen" : ""}`}>
      <div className="staysTopBar">
        <div className="staysTopInner">
          <div className="staysControlRow">
            <button className="staysFilterBtn" type="button" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={18} />
              <span>{t("stays.filters")}</span>
              {activeFilterCount > 0 ? <span className="staysFilterCountBubble">{activeFilterCount}</span> : null}
            </button>
            <span className="staysControlDivider" aria-hidden="true" />
            <div className={`staysSearchDock ${searchOpen ? "isOpen" : ""}`}>
              <button
                className="staysSearchBadge"
                type="button"
                onClick={() => setSearchOpen((prev) => !prev || !q)}
                aria-label={t("stays.searchAria")}
              >
                <Search size={16} />
              </button>
              <div className={`staysSearchExpand ${searchOpen ? "isOpen" : ""}`}>
                <input
                  ref={searchInputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("stays.searchPlaceholder")}
                  aria-label={t("stays.searchAria")}
                  onBlur={() => {
                    if (!q.trim()) setSearchOpen(false);
                  }}
                />
                {q?.length > 0 ? (
                  <button className="staysClearBtn" type="button" onClick={() => setQ("")} aria-label={t("stays.clearSearch")}>
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      <main className="staysMain3">
        <section className="staysColMap">
          <div className="staysMapCard">
            {!mapboxToken ? (
              <div className="staysEmptyState">
                <h3>{t("stays.mapTokenMissingTitle")}</h3>
                <p>{t("stays.mapTokenMissingText")}</p>
              </div>
            ) : (
              <>
                <Map
                  ref={mapRef}
                  mapboxAccessToken={mapboxToken}
                  initialViewState={defaultCenter}
                  mapStyle="mapbox://styles/rubenlpc/cmkmpcmjp009i01sg5rd4geb3"
                  onIdle={onMapIdle}
                  onDragEnd={onMapIdle}
                  onZoomEnd={onMapIdle}
                  onClick={() => closePopup()}
                  scrollZoom
                  cooperativeGestures
                  style={{ width: "100%", height: "100%" }}
                >
                  {mapItems.map((s) => {
                    const [lng, lat] = s.geo.coordinates;
                    const id = s.id;
                    const isActive = activeId === id && popupId !== id;
                    const isSelected = popupId === id;
                    const isFav = favIds?.has?.(id);
                    return (
                      <Marker key={id} longitude={lng} latitude={lat} anchor="bottom">
                        <button
                          type="button"
                          className={`staysPricePin ${isActive ? "isActive" : ""} ${isSelected ? "isSelected" : ""} ${isFav ? "isFav" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (popupId === id) closePopup();
                            else openPopup(id);
                          }}
                          title={s.title || s.name || "Stay"}
                        >
                          {moneyLabel(s.pricePerNight, s.currency || currency || "RON")}
                        </button>
                      </Marker>
                    );
                  })}
                  {!isMobile && popupId ? (
                    <Popup
                      longitude={mapItems.find((x) => x.id === popupId)?.geo?.coordinates?.[0] ?? 0}
                      latitude={mapItems.find((x) => x.id === popupId)?.geo?.coordinates?.[1] ?? 0}
                      anchor="top"
                      closeButton={false}
                      closeOnClick={false}
                      onClose={() => closePopup()}
                      maxWidth="360px"
                      offset={14}
                    >
                      <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                        {renderSelectedStayCard(mapItems.find((x) => x.id === popupId), "desktop")}
                      </div>
                    </Popup>
                  ) : null}
                </Map>
                {!mapItems.length && !loading ? <div className="staysMapNoPins">{t("stays.noPins")}</div> : null}
              </>
            )}
          </div>
        </section>
        <section className="staysColList">
          <div className="staysListHead">
            <div className="staysListTitle">
              {loading ? t("stays.listHeadLoading") : t("stays.mapZoneResults", { count: total })}
            </div>
          </div>
          {loading ? (
            <div className="staysSkeletonList" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="staysSkeletonCard">
                  <div className="staysSkeletonMedia" />
                  <div className="staysSkeletonBody">
                    <div className="staysSkeletonLine w70" />
                    <div className="staysSkeletonLine w45" />
                    <div className="staysSkeletonLine w60" />
                  </div>
                </div>
              ))}
            </div>
          ) : err ? (
            <div className="staysEmptyState">
              <h3>{t("stays.errorTitle")}</h3>
              <p>{err}</p>
              <button className="staysPrimaryBtn" type="button" onClick={() => window.location.reload()}>
                {t("stays.retry")}
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="staysEmptyState">
              <h3>{t("stays.emptyTitle")}</h3>
              <p>{t("stays.emptyText")}</p>
              <button className="staysPrimaryBtn" type="button" onClick={clearFilters}>
                {t("stays.resetFilters")}
              </button>
            </div>
          ) : (
            <>
              <div className="staysList" key={results.map((s) => s.id || s._id).join(",")}>
                {results.map((s, index) => {
                  const id = s.id || s._id;
                  const stay = { ...s, id };
                  return (
                    <div
                      key={id}
                      className={`staysListItemWrap ${activeId === id || popupId === id ? "isActive" : ""}`}
                      style={{ "--ri": index }}
                      onMouseEnter={() => syncHoverToMap(stay)}
                      onMouseLeave={() => {
                        setActiveId((current) => (popupId === current ? current : null));
                      }}
                    >
                      <StayCard
                        stay={stay}
                        active={activeId === id || popupId === id}
                        onOpen={() => openStay(stay)}
                        onHover={() => syncHoverToMap(stay)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="staysPager">
                <button className="staysPageBtn" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  {t("stays.pagerPrev")}
                </button>
                <div className="staysPageInfo">{t("stays.pagerInfo", { page, total: totalPages })}</div>
                <button className="staysPageBtn" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  {t("stays.pagerNext")}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
      {isMobile ? (
        <>
          <section className={`staysMobileSheet is-${mobileSheetState}`}>
            <button
              type="button"
              className="staysMobileSheetHandle"
              aria-label={t("stays.mobileViewSwitch")}
              onClick={toggleSheetLevel}
              onPointerDown={beginSheetDrag}
              onPointerUp={endSheetDrag}
            >
              <span className="staysMobileSheetGrip" />
            </button>
            <div className="staysMobileSheetHeader">
              <div className="staysMobileSheetTitle">{t("stays.mapZoneResults", { count: total })}</div>
            </div>
            {mobileSheetState === "peek" && selectedStay ? (
              <div className="staysMobilePeek">{renderSelectedStayCard(selectedStay, "mobile")}</div>
            ) : null}
            {mobileSheetState === "list" ? (
              <div className="staysMobileListWrap">
                {loading ? (
                  <div className="staysSkeletonList" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="staysSkeletonCard">
                        <div className="staysSkeletonMedia" />
                        <div className="staysSkeletonBody">
                          <div className="staysSkeletonLine w70" />
                          <div className="staysSkeletonLine w45" />
                          <div className="staysSkeletonLine w60" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : err ? (
                  <div className="staysEmptyState">
                    <h3>{t("stays.errorTitle")}</h3>
                    <p>{err}</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="staysEmptyState">
                    <h3>{t("stays.emptyTitle")}</h3>
                    <p>{t("stays.emptyText")}</p>
                  </div>
                ) : (
                  results.map((s) => {
                    const id = s.id || s._id;
                    const stay = { ...s, id };
                    return (
                      <div key={id} className={`staysListItemWrap ${activeId === id || popupId === id ? "isActive" : ""}`}>
                        <StayCard
                          stay={stay}
                          active={activeId === id || popupId === id}
                          onOpen={() => openStay(stay)}
                          onHover={() => syncHoverToMap(stay)}
                        />
                      </div>
                    );
                  })
                )}
                {!loading && !err && results.length > 0 ? (
                  <div className="staysPager staysPagerMobile">
                    <button className="staysPageBtn" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      {t("stays.pagerPrev")}
                    </button>
                    <div className="staysPageInfo">{t("stays.pagerInfo", { page, total: totalPages })}</div>
                    <button className="staysPageBtn" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      {t("stays.pagerNext")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
      <div className={`staysDrawerOverlay ${filtersOpen ? "open" : ""}`} onClick={() => setFiltersOpen(false)} />
      <div className={`staysDrawer ${filtersOpen ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="staysDrawerTop">
          <h3>{t("stays.filtersTitle")}</h3>
          <button className="staysIconBtn" type="button" onClick={() => setFiltersOpen(false)} aria-label={t("stays.drawerClose")}>
            <X size={18} />
          </button>
        </div>
        <div className="staysDrawerBody">{Filters}</div>
        <div className="staysDrawerBottom">
          <button className="staysGhostBtn" type="button" onClick={clearFilters}>
            {t("stays.reset")}
          </button>
          <button className="staysPrimaryBtn" type="button" onClick={() => setFiltersOpen(false)}>
            {loading ? t("stays.seeResults") : t("stays.showResultsCount", { count: total })}
          </button>
        </div>
      </div>
    </div>
  );
}
