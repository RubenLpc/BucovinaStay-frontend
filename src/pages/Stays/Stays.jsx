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

import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Map as MapIcon,
  List as ListIcon,
  MapPin,
  Sparkles,
  ChevronDown,
  Heart,
} from "lucide-react";

import { AMENITY_BY_KEY } from "../../constants/amenitiesCatalog";
import { PROPERTY_TYPES } from "../../constants/propertyTypes";
import { useTranslation } from "react-i18next";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const PAGE_SIZE = 9;

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

function smartStepForRange(range, currency) {
  const r = Math.max(0, Number(range) || 0);
  if (currency === "EUR") {
    if (r <= 80) return 1;
    if (r <= 250) return 5;
    return 10;
  }
  if (r <= 500) return 10;
  if (r <= 1500) return 25;
  return 50;
}
function roundToStep(v, step) {
  const s = Math.max(1, Number(step) || 1);
  return Math.round(v / s) * s;
}

export default function Stays() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef(null);

  // --- token
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

  // ✅ favorites
  const { isAuthenticated } = useAuthStore();
  const { favIds, toggle: toggleFav } = useFavorites(isAuthenticated);

  // ✅ initial state from URL
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");
  const [type, setType] = useState(searchParams.get("type") || "all");

  // 🔥 price filters
  const urlMinPrice = searchParams.get("priceMin");
  const urlMaxPrice = searchParams.get("priceMax");

  const [minPrice, setMinPrice] = useState(urlMinPrice != null ? parseNum(urlMinPrice, 0) : null);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice != null ? parseNum(urlMaxPrice, 0) : null);

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
  const [minRatingDraft, setMinRatingDraft] = useState(minRating);

  // layout state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const [page, setPage] = useState(parseNum(searchParams.get("page"), 1));
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Map state (area search)
  const [boundsCommitted, setBoundsCommitted] = useState(searchParams.get("bounds") || "");
  const [areaDirty, setAreaDirty] = useState(false);
  const [boundsDirtyStr, setBoundsDirtyStr] = useState("");

  const [activeId, setActiveId] = useState(null);
  const [popupId, setPopupId] = useState(null);

  const closeTimerRef = useRef(null);

  const openPopup = (id) => {
    clearTimeout(closeTimerRef.current);
    setPopupId(id);
    setActiveId(id);
  };

  const scheduleClosePopup = () => {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setPopupId(null);
      setActiveId(null);
    }, 140);
  };
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // ✅ debounce search
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
  }, [qDebounced, sort, type, minPrice, maxPrice, minRating, amenities, boundsCommitted, currency]);

  // ✅ keep URL in sync
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);

    setParam(sp, "q", qDebounced.trim() ? qDebounced.trim() : "");
    setParam(sp, "sort", sort !== "recommended" ? sort : "");
    setParam(sp, "type", type !== "all" ? type : "");

    setParam(sp, "priceMin", minPrice != null ? String(minPrice) : "");
    setParam(sp, "priceMax", maxPrice != null ? String(maxPrice) : "");

    setParam(sp, "minRating", minRating > 0 ? minRating : "");

    const fac = amenities.size ? Array.from(amenities).join(",") : "";
    setParam(sp, "facilities", fac);

    setParam(sp, "currency", currency !== "RON" ? currency : "");
    setParam(sp, "bounds", boundsCommitted || "");
    setParam(sp, "page", page > 1 ? page : "");

    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, sort, type, minPrice, maxPrice, minRating, amenities, boundsCommitted, page, currency]);

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
  }, [qDebounced, sort, type, minPrice, maxPrice, minRating, amenities, page, boundsCommitted, currency]);

  // 🔥 Price bounds inteligente din rezultate
  useEffect(() => {
    const arr = Array.isArray(results) ? results : [];
    const prices = arr
      .map((x) => x?.pricePerNight)
      .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);

    if (!prices.length) {
      const fallback = currency === "EUR" ? { min: 0, max: 500 } : { min: 0, max: 2000 };
      const step = smartStepForRange(fallback.max - fallback.min, currency);
      setPriceBounds({ ...fallback, step });

      setMinPriceDraft((p) => (p == null ? fallback.min : p));
      setMaxPriceDraft((p) => (p == null ? fallback.max : p));
      return;
    }

    const pLow = prices[Math.floor((prices.length - 1) * 0.02)];
    const pHigh = prices[Math.floor((prices.length - 1) * 0.98)];

    const rawMin = Math.max(0, pLow);
    const rawMax = Math.max(rawMin, pHigh);

    const step = smartStepForRange(rawMax - rawMin, currency);
    const niceMin = roundToStep(rawMin, step);
    const niceMax = roundToStep(rawMax, step);

    setPriceBounds({ min: niceMin, max: niceMax, step });

    setMinPriceDraft((prev) => {
      if (prev == null) return niceMin;
      return clamp(prev, niceMin, niceMax);
    });
    setMaxPriceDraft((prev) => {
      if (prev == null) return niceMax;
      return clamp(prev, niceMin, niceMax);
    });

    if (minPrice != null) setMinPrice((p) => clamp(p, niceMin, niceMax));
    if (maxPrice != null) setMaxPrice((p) => clamp(p, niceMin, niceMax));
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
    setMinPriceDraft(priceBounds.min);
    setMaxPriceDraft(priceBounds.max);
    setMinRating(0);
    setMinRatingDraft(0);
    setAmenities(new Set());
    setBoundsCommitted("");
    setAreaDirty(false);
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

  // Map handlers
  const onMapIdle = () => {
    const m = mapRef.current?.getMap?.();
    if (!m) return;
    const b = m.getBounds?.();
    const enc = encodeBoundsFromMapbox(b);
    if (!enc) return;

    if (enc !== boundsCommitted) {
      setBoundsDirtyStr(enc);
      setAreaDirty(true);
    }
  };

  const applyAreaSearch = () => {
    if (!boundsDirtyStr) return;
    setBoundsCommitted(boundsDirtyStr);
    setAreaDirty(false);
  };

  // hover sync
  const flyToStay = (stay) => {
    const m = mapRef.current?.getMap?.();
    if (!m) return;
    const coords = stay?.geo?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) return;

    const [lng, lat] = coords;
    try {
      m.easeTo({ center: [lng, lat], duration: 450, zoom: Math.max(m.getZoom(), 10) });
    } catch {
      // ignore
    }
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

    if (minPrice != null) {
      chips.push({
        key: "minPrice",
        label: t("stays.chips.minPrice", { value: moneyLabel(minPrice, currency) }),
        onX: () => {
          setMinPrice(null);
          setMinPriceDraft(priceBounds.min);
        },
      });
    }
    if (maxPrice != null) {
      chips.push({
        key: "maxPrice",
        label: t("stays.chips.maxPrice", { value: moneyLabel(maxPrice, currency) }),
        onX: () => {
          setMaxPrice(null);
          setMaxPriceDraft(priceBounds.max);
        },
      });
    }

    if (minRating > 0) {
      chips.push({
        key: "rating",
        label: `${minRating.toFixed(1)}+`,
        onX: () => {
          setMinRating(0);
          setMinRatingDraft(0);
        },
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

    if (boundsCommitted) chips.push({ key: "bounds", label: t("stays.areaSet"), onX: () => setBoundsCommitted("") });

    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, minPrice, maxPrice, minRating, amenities, boundsCommitted, currency, priceBounds.min, priceBounds.max, locale]); // locale helps moneyLabel format

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

  // ---------- Sidebar filters ----------
  const Filters = (
    <aside className="staysFiltersCard">
      <div className="staysFiltersTop">
        <div className="staysFiltersTitle">
          <div className="staysFiltersH">{t("stays.filtersTitle")}</div>
          <div className="staysFiltersSub">{t("stays.filtersHint")}</div>
        </div>
        <button className="staysLinkBtn" type="button" onClick={clearFilters}>
          {t("stays.reset")}
        </button>
      </div>

      {/* Tip proprietate */}
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.propertyType")}</div>

        <div className="staysTypeGrid">
          <button
            type="button"
            className={`staysTypeTile ${type === "all" ? "isOn" : ""}`}
            onClick={() => setType("all")}
          >
            <div className="staysTypeIconWrap">
              <Sparkles size={18} />
            </div>
            <div className="staysTypeTxt">
              <div className="staysTypeName">{t("stays.allTypes")}</div>
              <div className="staysTypeDesc">{t("stays.allTypesDesc")}</div>
            </div>
          </button>

          {PROPERTY_TYPES.map(({ key, labelKey, descKey, label, description, Icon }) => {
            const typeName = labelKey ? t(labelKey) : label || key;
            const typeDesc = descKey ? t(descKey) : description || "";
            return (
              <button
                key={key}
                type="button"
                className={`staysTypeTile ${type === key ? "isOn" : ""}`}
                onClick={() => setType(key)}
              >
                <div className="staysTypeIconWrap">
                  <Icon size={18} />
                </div>
                <div className="staysTypeTxt">
                  <div className="staysTypeName">{typeName}</div>
                  <div className="staysTypeDesc">{typeDesc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preț */}
      <div className="staysFilterBlock">
        <div className="staysRowBetween">
          <div className="staysLabel">{t("stays.pricePerNight")}</div>

          <div className="staysInlineSelect">
            <span className="staysTiny">{t("stays.currency")}</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label={t("stays.currency")}>
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div className="staysPillSmall" style={{ marginBottom: 8 }}>
          {moneyLabel(minPriceDraft ?? priceBounds.min, currency)} – {moneyLabel(maxPriceDraft ?? priceBounds.max, currency)}
        </div>

        <div className="staysDualRange">
          <div className="staysDualLine">
            <span className="staysTiny">{t("stays.min")}</span>
            <input
              className="staysRange"
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceBounds.step}
              value={minPriceDraft ?? priceBounds.min}
              onChange={(e) => {
                const v = clamp(parseInt(e.target.value, 10), priceBounds.min, maxPriceDraft ?? priceBounds.max);
                setMinPriceDraft(v);
              }}
              onMouseUp={() => setMinPrice(minPriceDraft ?? priceBounds.min)}
              onTouchEnd={() => setMinPrice(minPriceDraft ?? priceBounds.min)}
            />
          </div>

          <div className="staysDualLine">
            <span className="staysTiny">{t("stays.max")}</span>
            <input
              className="staysRange"
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceBounds.step}
              value={maxPriceDraft ?? priceBounds.max}
              onChange={(e) => {
                const v = clamp(parseInt(e.target.value, 10), minPriceDraft ?? priceBounds.min, priceBounds.max);
                setMaxPriceDraft(v);
              }}
              onMouseUp={() => setMaxPrice(maxPriceDraft ?? priceBounds.max)}
              onTouchEnd={() => setMaxPrice(maxPriceDraft ?? priceBounds.max)}
            />
          </div>
        </div>

        {(minPrice != null || maxPrice != null) && (
          <button
            className="staysGhostBtn"
            type="button"
            onClick={() => {
              setMinPrice(null);
              setMaxPrice(null);
              setMinPriceDraft(priceBounds.min);
              setMaxPriceDraft(priceBounds.max);
            }}
            style={{ marginTop: 10 }}
          >
            <X size={16} /> {t("stays.resetPrice")}
          </button>
        )}
      </div>

      {/* Rating */}
      <div className="staysFilterBlock">
        <div className="staysRowBetween">
          <div className="staysLabel">{t("stays.minScore")}</div>
          <div className="staysPillSmall">{minRatingDraft.toFixed(1)}+</div>
        </div>

        <input
          className="staysRange"
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={minRatingDraft}
          onChange={(e) => setMinRatingDraft(clamp(parseFloat(e.target.value), 0, 5))}
          onMouseUp={() => setMinRating(minRatingDraft)}
          onTouchEnd={() => setMinRating(minRatingDraft)}
        />
        <div className="staysTiny" style={{ marginTop: 6 }}>
          {t("stays.minScoreHint")}
        </div>
      </div>

      {/* Facilități */}
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.amenities")}</div>

        <div className="staysAmenityGrid">
          {Object.values(AMENITY_BY_KEY)
            .slice(0, 18)
            .map((a) => {
              const Icon = a.icon || Sparkles;
              const on = amenities.has(a.key);
              const label = a.labelKey ? t(a.labelKey) : a.label || a.key;

              return (
                <button
                  key={a.key}
                  type="button"
                  className={`staysAmenityChip ${on ? "isOn" : ""}`}
                  onClick={() => toggleAmenity(a.key)}
                  title={label}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Zonă hartă */}
      <div className="staysFilterBlock">
        <div className="staysLabel">{t("stays.mapArea")}</div>
        <div className="staysHintBox">{t("stays.mapAreaHint")}</div>

        {boundsCommitted && (
          <button className="staysGhostBtn" type="button" onClick={() => setBoundsCommitted("")}>
            <X size={16} /> {t("stays.resetArea")}
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className={`container staysMapLayout ${filtersOpen ? "filtersOpen" : ""} ${mobileMapOpen ? "mapOpen" : ""}`}>
      <div className="staysTopBar">
        <div className="staysTopInner">
          <div className="staysBrandLine">
            <div className="staysTitle">
              <MapPin size={16} />
              <span>{t("stays.title")}</span>
            </div>
            <div className="staysKicker">
              <Sparkles size={16} />
              <span>
                <strong>{total}</strong> {t("stays.results", { count: total }).replace(String(total), "").trim()}
              </span>
            </div>
          </div>

          <div className="staysMobileToggles">
            <button
              className={`staysToggleBtn ${!mobileMapOpen ? "isOn" : ""}`}
              type="button"
              onClick={() => setMobileMapOpen(false)}
            >
              <ListIcon size={18} /> {t("stays.list")}
            </button>
            <button
              className={`staysToggleBtn ${mobileMapOpen ? "isOn" : ""}`}
              type="button"
              onClick={() => setMobileMapOpen(true)}
            >
              <MapIcon size={18} /> {t("stays.map")}
            </button>
          </div>

          <div className="staysControlRow">
            <div className="staysSearch">
              <Search size={18} className="staysFieldIcon" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("stays.searchPlaceholder")}
                aria-label={t("stays.searchAria")}
              />
              {q?.length > 0 && (
                <button className="staysClearBtn" type="button" onClick={() => setQ("")} aria-label={t("stays.clearSearch")}>
                  <X size={16} />
                </button>
              )}
            </div>

            <button className="staysFilterBtn" type="button" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={18} />
              <span>{t("stays.filters")}</span>
              <ChevronDown size={16} className="staysChevron" />
            </button>

            <div className="staysSort">
              <ArrowUpDown size={18} className="staysFieldIcon" />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                <option value="recommended">{locale === "ro-RO" ? "Recomandate" : "Recommended"}</option>
                <option value="ratingDesc">{locale === "ro-RO" ? "Rating (desc)" : "Rating (desc)"}</option>
                <option value="priceAsc">{locale === "ro-RO" ? "Preț (mic)" : "Price (low)"}</option>
                <option value="priceDesc">{locale === "ro-RO" ? "Preț (mare)" : "Price (high)"}</option>
              </select>
            </div>
          </div>

          {activeChips.length ? (
            <div className="staysActiveChips" aria-label={t("stays.activeFiltersAria")}>
              {activeChips.map((c) => (
                <button key={c.key} type="button" className="staysActiveChip" onClick={c.onX} title={t("stays.remove")}>
                  {c.label} <span className="staysChipX">✕</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="staysHintInline">{t("stays.tipArea")}</div>
          )}
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
                {areaDirty ? (
                  <button className="staysSearchAreaBtn" type="button" onClick={applyAreaSearch}>
                    {t("stays.searchThisArea")}
                  </button>
                ) : null}

                <Map
                  ref={mapRef}
                  mapboxAccessToken={mapboxToken}
                  initialViewState={defaultCenter}
                  mapStyle="mapbox://styles/rubenlpc/cmkmpcmjp009i01sg5rd4geb3"
                  onIdle={onMapIdle}
                  onDragEnd={onMapIdle}
                  onZoomEnd={onMapIdle}
                  onClick={() => {
                    setPopupId(null);
                    setActiveId(null);
                  }}
                  scrollZoom
                  cooperativeGestures
                  style={{ width: "100%", height: "100%" }}
                >
                  {mapItems.map((s) => {
                    const [lng, lat] = s.geo.coordinates;
                    const id = s.id;
                    const isActive = activeId === id;
                    const isFav = favIds?.has?.(id);

                    return (
                      <Marker key={id} longitude={lng} latitude={lat} anchor="bottom">
                        <button
                          type="button"
                          className={`staysPinDot ${isActive ? "isActive" : ""} ${isFav ? "isFav" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPopup(id);
                          }}
                          onMouseEnter={() => openPopup(id)}
                          onMouseLeave={() => scheduleClosePopup()}
                          title={s.title || s.name || "Stay"}
                        >
                          <MapPin size={16} />
                        </button>
                      </Marker>
                    );
                  })}

                  {popupId ? (
                    <Popup
                      longitude={mapItems.find((x) => x.id === popupId)?.geo?.coordinates?.[0] ?? 0}
                      latitude={mapItems.find((x) => x.id === popupId)?.geo?.coordinates?.[1] ?? 0}
                      anchor="top"
                      closeButton={false}
                      closeOnClick={false}
                      onClose={() => setPopupId(null)}
                      maxWidth="320px"
                      offset={14}
                    >
                      {(() => {
                        const s = mapItems.find((x) => x.id === popupId);
                        if (!s) return null;

                        const title = s.title || s.name || (locale === "ro-RO" ? "Cazare" : "Stay");
                        const loc = s.locality || s.city || s.location || "—";
                        const img = s.image || s.coverImage?.url || s.images?.[0]?.url || "";
                        const ccy = s.currency || currency || "RON";
                        const price = moneyLabel(s.pricePerNight, ccy);
                        const rating = Number(s.ratingAvg ?? s.rating ?? 0);
                        const reviews = Number(s.reviewsCount ?? s.reviews ?? 0);

                        const isFav = favIds?.has?.(s.id);

                        return (
                          <div
                            onMouseEnter={() => clearTimeout(closeTimerRef.current)}
                            onMouseLeave={() => scheduleClosePopup()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="staysMiniCard"
                              onClick={() => openStay(s)}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="staysMiniImg">
                                {img ? <img src={img} alt={title} loading="lazy" /> : <div className="staysMiniImgPh" />}
                              </div>

                              <div className="staysMiniBody">
                                <div className="staysMiniTop">
                                  <div className="staysMiniTitle">{title}</div>

                                  <button
                                    type="button"
                                    className={`staysFavBtnMini ${isFav ? "active" : ""} ${!isAuthenticated ? "locked" : ""}`}
                                    aria-label={isFav ? (locale === "ro-RO" ? "Scoate din favorite" : "Remove from favorites") : (locale === "ro-RO" ? "Adaugă la favorite" : "Add to favorites")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleFav(s.id);
                                    }}
                                  >
                                    <Heart size={16} className="staysFavIcon" aria-hidden="true" />
                                  </button>
                                </div>

                                <div className="staysMiniSub">{loc}</div>

                                <div className="staysMiniMeta">
                                  <span className="staysMiniRating">★ {rating ? rating.toFixed(1) : "—"}</span>
                                  <span className="staysMiniDot">•</span>
                                  <span className="staysMiniReviews">{t("stays.popup.reviews", { count: reviews })}</span>
                                  <span className="staysMiniDot">•</span>
                                  <span className="staysMiniPrice">{price}</span>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })()}
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
              {loading ? t("stays.listHeadLoading") : t("stays.results", { count: total })}
            </div>
          </div>

          {loading ? (
            <div className="staysEmptyState">
              <h3>{t("stays.loadingTitle")}</h3>
              <p>{t("stays.loadingText")}</p>
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
              <div className="staysList">
                {results.map((s) => {
                  const id = s.id || s._id;
                  const stay = { ...s, id };

                  return (
                    <div
                      key={id}
                      className={`staysListItemWrap ${activeId === id ? "isActive" : ""}`}
                      onMouseEnter={() => {
                        setActiveId(id);
                        flyToStay(stay);
                      }}
                    >
                      <StayCard
                        stay={stay}
                        active={activeId === id}
                        onOpen={() => openStay(stay)}
                        onHover={() => {
                          setActiveId(id);
                          flyToStay(stay);
                        }}
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
            {t("stays.seeResults")}
          </button>
        </div>
      </div>
    </div>
  );
}
