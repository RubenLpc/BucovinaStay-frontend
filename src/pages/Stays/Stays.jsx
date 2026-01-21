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

function moneyLabel(value, currency = "RON") {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "Vezi";
  try {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

function smartStepForRange(range, currency) {
  const r = Math.max(0, Number(range) || 0);
  if (currency === "EUR") {
    if (r <= 80) return 1;
    if (r <= 250) return 5;
    return 10;
  }
  // RON
  if (r <= 500) return 10;
  if (r <= 1500) return 25;
  return 50;
}

function roundToStep(v, step) {
  const s = Math.max(1, Number(step) || 1);
  return Math.round(v / s) * s;
}

export default function Stays() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef(null);

  // --- token
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

  // ✅ favorites (same pattern ca HorizontalListings)
  const { isAuthenticated } = useAuthStore();
  const { favIds, toggle: toggleFav } = useFavorites(isAuthenticated);

  // ✅ initial state from URL
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");

  const [type, setType] = useState(searchParams.get("type") || "all");

  // 🔥 IMPORTANT: price filters NU sunt aplicate implicit
  // Dacă nu există în URL, sunt null => nu trimitem priceMin/priceMax la backend
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

  // draft sliders (apply on release) — inițial se aliniază la bounds
  const [minPriceDraft, setMinPriceDraft] = useState(null);
  const [maxPriceDraft, setMaxPriceDraft] = useState(null);

  const [minRatingDraft, setMinRatingDraft] = useState(minRating);

  // layout state
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile drawer
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const [page, setPage] = useState(parseNum(searchParams.get("page"), 1));
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Map state (area search)
  const [boundsCommitted, setBoundsCommitted] = useState(searchParams.get("bounds") || "");
  const [areaDirty, setAreaDirty] = useState(false);
  const [boundsDirtyStr, setBoundsDirtyStr] = useState(""); // keep encoded bounds

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
  useEffect(() => {
    return () => clearTimeout(closeTimerRef.current);
  }, []);

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

  // ✅ keep URL in sync (committed only)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);

    setParam(sp, "q", qDebounced.trim() ? qDebounced.trim() : "");
    setParam(sp, "sort", sort !== "recommended" ? sort : "");
    setParam(sp, "type", type !== "all" ? type : "");

    // price: scriem în URL doar dacă sunt aplicate efectiv (nu default)
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
          currency, // RON/EUR
        };

        if (qDebounced.trim()) params.q = qDebounced.trim();
        if (type !== "all") params.type = type;

        // 🔥 NU trimitem priceMin/priceMax dacă nu sunt aplicate (null)
        if (minPrice != null) params.priceMin = String(minPrice);
        if (maxPrice != null) params.priceMax = String(maxPrice);

        if (minRating > 0) params.minRating = String(minRating);
        if (amenities.size > 0) params.facilities = Array.from(amenities).join(",");

        const bParams = boundsToParams(boundsCommitted);
        if (bParams) Object.assign(params, bParams);

        const data = await listStays(params);
        if (!alive) return;

        setResults(data.items || []);
        console.log("first item:", data.items?.[0]);

        setTotal(data.total ?? 0);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Eroare la încărcare.");
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

  // 🔥 Price bounds inteligente din rezultate (și setup draft dacă e null)
  useEffect(() => {
    const arr = Array.isArray(results) ? results : [];
    const prices = arr
      .map((x) => x?.pricePerNight)
      .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);

    if (!prices.length) {
      // fallback safe
      const fallback = currency === "EUR" ? { min: 0, max: 500 } : { min: 0, max: 2000 };
      const step = smartStepForRange(fallback.max - fallback.min, currency);
      setPriceBounds({ ...fallback, step });

      // dacă draft încă null -> îl aliniez la fallback (fără să aplic filtrul)
      setMinPriceDraft((p) => (p == null ? fallback.min : p));
      setMaxPriceDraft((p) => (p == null ? fallback.max : p));
      return;
    }

    // percentile-ish ca să nu te omoare outlier-urile:
    const pLow = prices[Math.floor((prices.length - 1) * 0.02)];
    const pHigh = prices[Math.floor((prices.length - 1) * 0.98)];

    const rawMin = Math.max(0, pLow);
    const rawMax = Math.max(rawMin, pHigh);

    const step = smartStepForRange(rawMax - rawMin, currency);
    const niceMin = roundToStep(rawMin, step);
    const niceMax = roundToStep(rawMax, step);

    setPriceBounds({ min: niceMin, max: niceMax, step });

    // IMPORTANT:
    // - Dacă user NU are preț aplicat (minPrice/maxPrice null), păstrăm filtrele neaplicate,
    //   dar setăm slider draft la bounds ca să arate “full range”.
    // - Dacă are preț aplicat (din URL / user), NU îi resetăm sliderul.
    setMinPriceDraft((prev) => {
      if (prev == null) return niceMin;
      return clamp(prev, niceMin, niceMax);
    });
    setMaxPriceDraft((prev) => {
      if (prev == null) return niceMax;
      return clamp(prev, niceMin, niceMax);
    });

    // dacă există filtre aplicate, le ținem în bounds
    if (minPrice != null) setMinPrice((p) => clamp(p, niceMin, niceMax));
    if (maxPrice != null) setMaxPrice((p) => clamp(p, niceMin, niceMax));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, currency]);

  // dacă schimbi moneda, NU vreau să “rămână” filtrul de preț aplicat în vechea monedă
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

    // 🔥 reset preț => neaplicat
    setMinPrice(null);
    setMaxPrice(null);

    // draft revine la bounds curente (vizual)
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

  // Bucovina-ish fallback
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

  // hover sync: center map softly
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

  // chips
  const activeChips = useMemo(() => {
    const chips = [];

    if (type !== "all") {
      const meta = PROPERTY_TYPES?.find?.((t) => t.key === type);
      chips.push({ key: "type", label: meta?.label || type, onX: () => setType("all") });
    }

    // 🔥 price chips doar dacă filtrul e aplicat (minPrice/maxPrice != null)
    if (minPrice != null) {
      chips.push({
        key: "minPrice",
        label: `min ${moneyLabel(minPrice, currency)}`,
        onX: () => {
          setMinPrice(null);
          setMinPriceDraft(priceBounds.min);
        },
      });
    }
    if (maxPrice != null) {
      chips.push({
        key: "maxPrice",
        label: `max ${moneyLabel(maxPrice, currency)}`,
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
          const meta = AMENITY_BY_KEY?.[k];
          chips.push({ key: `a:${k}`, label: meta?.label || k, onX: () => toggleAmenity(k) });
        });
      if (amenities.size > 3) chips.push({ key: "more", label: `+${amenities.size - 3}`, onX: () => setFiltersOpen(true) });
    }

    if (boundsCommitted) chips.push({ key: "bounds", label: "Zonă setată", onX: () => setBoundsCommitted("") });

    return chips;
  }, [type, minPrice, maxPrice, minRating, amenities, boundsCommitted, currency, priceBounds.min, priceBounds.max]);

  const handleToggleFav = async (id) => {
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

  // ---------- Sidebar filters (desktop + in mobile drawer) ----------
  const Filters = (
    <aside className="staysFiltersCard">
      {/* Header */}
      <div className="staysFiltersTop">
        <div className="staysFiltersTitle">
          <div className="staysFiltersH">Filtre</div>
          <div className="staysFiltersSub">
            Ajustează rezultatele pentru a găsi cazarea perfectă.
          </div>
        </div>
        <button className="staysLinkBtn" type="button" onClick={clearFilters}>
          Resetează
        </button>
      </div>
  
      {/* Tip proprietate */}
      <div className="staysFilterBlock">
        <div className="staysLabel">Tip proprietate</div>
  
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
              <div className="staysTypeName">Toate</div>
              <div className="staysTypeDesc">Include toate tipurile</div>
            </div>
          </button>
  
          {PROPERTY_TYPES.map(({ key, label, Icon, description }) => (
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
                <div className="staysTypeName">{label}</div>
                <div className="staysTypeDesc">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
  
      {/* Preț */}
      <div className="staysFilterBlock">
        <div className="staysRowBetween">
          <div className="staysLabel">Preț pe noapte</div>
  
          {/* Monedă – mutată logic lângă preț */}
          <div className="staysInlineSelect">
            <span className="staysTiny">Monedă</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Monedă"
            >
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
  
        <div className="staysPillSmall" style={{ marginBottom: 8 }}>
          {moneyLabel(minPriceDraft ?? priceBounds.min, currency)} –{" "}
          {moneyLabel(maxPriceDraft ?? priceBounds.max, currency)}
        </div>
  
        <div className="staysDualRange">
          <div className="staysDualLine">
            <span className="staysTiny">Minim</span>
            <input
              className="staysRange"
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceBounds.step}
              value={minPriceDraft ?? priceBounds.min}
              onChange={(e) => {
                const v = clamp(
                  parseInt(e.target.value, 10),
                  priceBounds.min,
                  maxPriceDraft ?? priceBounds.max
                );
                setMinPriceDraft(v);
              }}
              onMouseUp={() => setMinPrice(minPriceDraft ?? priceBounds.min)}
              onTouchEnd={() => setMinPrice(minPriceDraft ?? priceBounds.min)}
            />
          </div>
  
          <div className="staysDualLine">
            <span className="staysTiny">Maxim</span>
            <input
              className="staysRange"
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={priceBounds.step}
              value={maxPriceDraft ?? priceBounds.max}
              onChange={(e) => {
                const v = clamp(
                  parseInt(e.target.value, 10),
                  minPriceDraft ?? priceBounds.min,
                  priceBounds.max
                );
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
            <X size={16} /> Resetează prețul
          </button>
        )}
      </div>
  
      {/* Rating */}
      <div className="staysFilterBlock">
        <div className="staysRowBetween">
          <div className="staysLabel">Scor minim</div>
          <div className="staysPillSmall">
            {minRatingDraft.toFixed(1)}+
          </div>
        </div>
  
        <input
          className="staysRange"
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={minRatingDraft}
          onChange={(e) =>
            setMinRatingDraft(clamp(parseFloat(e.target.value), 0, 5))
          }
          onMouseUp={() => setMinRating(minRatingDraft)}
          onTouchEnd={() => setMinRating(minRatingDraft)}
        />
        <div className="staysTiny" style={{ marginTop: 6 }}>
          Arată doar cazări cu rating egal sau mai mare
        </div>
      </div>
  
      {/* Facilități */}
      <div className="staysFilterBlock">
        <div className="staysLabel">Facilități</div>
  
        <div className="staysAmenityGrid">
          {Object.values(AMENITY_BY_KEY)
            .slice(0, 18)
            .map((a) => {
              const Icon = a.icon || Sparkles;
              const on = amenities.has(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  className={`staysAmenityChip ${on ? "isOn" : ""}`}
                  onClick={() => toggleAmenity(a.key)}
                  title={a.label}
                >
                  <Icon size={16} />
                  <span>{a.label}</span>
                </button>
              );
            })}
        </div>
      </div>
  
      {/* Zonă hartă */}
      <div className="staysFilterBlock">
        <div className="staysLabel">Zonă pe hartă</div>
        <div className="staysHintBox">
          Mută harta și apasă <strong>„Caută în această zonă”</strong>.
        </div>
  
        {boundsCommitted && (
          <button
            className="staysGhostBtn"
            type="button"
            onClick={() => setBoundsCommitted("")}
          >
            <X size={16} /> Resetează zona
          </button>
        )}
      </div>
    </aside>
  );
  

  return (
    <div className={`staysMapLayout ${filtersOpen ? "filtersOpen" : ""} ${mobileMapOpen ? "mapOpen" : ""}`}>
      {/* Top / header (similar to screenshot) */}
      <div className="staysTopBar">
        <div className="staysTopInner">
          <div className="staysBrandLine">
            <div className="staysTitle">
              <MapPin size={16} />
              <span>Cazări în Bucovina</span>
            </div>
            <div className="staysKicker">
              <Sparkles size={16} />
              <span>
                <strong>{total}</strong> rezultate
              </span>
            </div>
          </div>

          {/* Mobile toggle list/map */}
          <div className="staysMobileToggles">
            <button
              className={`staysToggleBtn ${!mobileMapOpen ? "isOn" : ""}`}
              type="button"
              onClick={() => setMobileMapOpen(false)}
            >
              <ListIcon size={18} /> Listă
            </button>
            <button
              className={`staysToggleBtn ${mobileMapOpen ? "isOn" : ""}`}
              type="button"
              onClick={() => setMobileMapOpen(true)}
            >
              <MapIcon size={18} /> Hartă
            </button>
          </div>

          {/* Search + sort */}
          <div className="staysControlRow">
            <div className="staysSearch">
              <Search size={18} className="staysFieldIcon" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Caută cazare, ocalitate, nume..."
                aria-label="Caută cazări"
              />
              {q?.length > 0 && (
                <button className="staysClearBtn" type="button" onClick={() => setQ("")} aria-label="Șterge căutarea">
                  <X size={16} />
                </button>
              )}
            </div>

            <button className="staysFilterBtn" type="button" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={18} />
              <span>Filtre</span>
              <ChevronDown size={16} className="staysChevron" />
            </button>

            <div className="staysSort">
              <ArrowUpDown size={18} className="staysFieldIcon" />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortează">
                <option value="recommended">Recomandate</option>
                <option value="ratingDesc">Rating (desc)</option>
                <option value="priceAsc">Preț (mic)</option>
                <option value="priceDesc">Preț (mare)</option>
              </select>
            </div>

           
          </div>

          {/* active chips */}
          {activeChips.length ? (
            <div className="staysActiveChips" aria-label="Filtre active">
              {activeChips.map((c) => (
                <button key={c.key} type="button" className="staysActiveChip" onClick={c.onX} title="Elimină">
                  {c.label} <span className="staysChipX">✕</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="staysHintInline">Tip: mută harta și apasă “Caută în această zonă”.</div>
          )}
        </div>
      </div>

      {/* MAIN 3-col layout: filters | map | list */}
      <main className="staysMain3">
        {/* Filters (desktop) */}
        {/* (dacă tu deja îl render-ezi în desktop în altă parte, lasă cum ai; aici nu-ți schimb layout-ul) */}

        {/* Map */}
        <section className="staysColMap">
          <div className="staysMapCard">
            {!mapboxToken ? (
              <div className="staysEmptyState">
                <h3>Mapbox token lipsă</h3>
                <p>
                  Tokenul a expirat sau nu este configurat. Contactează
                  administratorul site-ului.
                </p>
              </div>
            ) : (
              <>
                {areaDirty ? (
                  <button className="staysSearchAreaBtn" type="button" onClick={applyAreaSearch}>
                    Caută în această zonă
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
                          title={s.title || s.name || "Cazare"}
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

                        const title = s.title || s.name || "Cazare";
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

                                  {/* ❤️ Favorite in popup */}
                                  <button
                                    type="button"
                                    className={`staysFavBtnMini ${isFav ? "active" : ""} ${!isAuthenticated ? "locked" : ""}`}
                                    aria-label={isFav ? "Scoate din favorite" : "Adaugă la favorite"}
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
                                  <span className="staysMiniReviews">{reviews} reviews</span>
                                  <span className="staysMiniDot">•</span>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })()}
                    </Popup>
                  ) : null}
                </Map>

                {!mapItems.length && !loading ? (
                  <div className="staysMapNoPins">Nu există locații pe hartă pentru rezultatele curente.</div>
                ) : null}
              </>
            )}
          </div>
        </section>

        {/* List */}
        <section className="staysColList">
          <div className="staysListHead">
            <div className="staysListTitle">{loading ? "Loading..." : `${total} rezultate`}</div>
          </div>

          {loading ? (
            <div className="staysEmptyState">
              <h3>Se încarcă...</h3>
              <p>Aducem cele mai noi cazări disponibile.</p>
            </div>
          ) : err ? (
            <div className="staysEmptyState">
              <h3>Eroare</h3>
              <p>{err}</p>
              <button className="staysPrimaryBtn" type="button" onClick={() => window.location.reload()}>
                Reîncearcă
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="staysEmptyState">
              <h3>Nimic găsit</h3>
              <p>Încearcă să schimbi filtrele sau să cauți altceva.</p>
              <button className="staysPrimaryBtn" type="button" onClick={clearFilters}>
                Resetează filtrele
              </button>
            </div>
          ) : (
            <>
              <div className="staysList">
                {results.map((s) => {
                  const id = s.id || s._id;
                  const stay = { ...s, id };
                  const isFav = favIds?.has?.(id);

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
                <button
                  className="staysPageBtn"
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Înapoi
                </button>

                <div className="staysPageInfo">
                  Pagina <strong>{page}</strong> din <strong>{totalPages}</strong>
                </div>

                <button
                  className="staysPageBtn"
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Înainte →
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Mobile filters drawer */}
      <div className={`staysDrawerOverlay ${filtersOpen ? "open" : ""}`} onClick={() => setFiltersOpen(false)} />
      <div className={`staysDrawer ${filtersOpen ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="staysDrawerTop">
          <h3>Filtre</h3>
          <button className="staysIconBtn" type="button" onClick={() => setFiltersOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="staysDrawerBody">{Filters}</div>
        <div className="staysDrawerBottom">
          <button className="staysGhostBtn" type="button" onClick={clearFilters}>
            Resetează
          </button>
          <button className="staysPrimaryBtn" type="button" onClick={() => setFiltersOpen(false)}>
Vezi rezultate          </button>
        </div>
      </div>
    </div>
  );
}
