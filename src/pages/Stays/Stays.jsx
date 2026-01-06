// client/src/pages/Stays/Stays.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Stays.css";
import { listStays } from "../../api/staysService";
import StayCard from "../../components/Stays/StayCard";
import {
  MapPin,
  Sparkles,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";

const AMENITIES = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "parking", label: "Parcare" },
  { key: "breakfast", label: "Mic dejun" },
  { key: "petFriendly", label: "Pet-friendly" },
  { key: "spa", label: "Spa" },
  { key: "kitchen", label: "Bucătărie" },
  { key: "ac", label: "Aer condiționat" },
  { key: "sauna", label: "Saună" },
  { key: "fireplace", label: "Șemineu" },
];

const TYPES = [
  { value: "apartament", label: "Apartament" },
  { value: "pensiune", label: "Pensiune" },
  { value: "cabana", label: "Cabana" },
  { value: "vila", label: "Vila" },
  { value: "tiny_house", label: "Tiny House" },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function Stays() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recommended"); // recommended | priceAsc | priceDesc | ratingDesc
  const [type, setType] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(600);
  const [amenities, setAmenities] = useState(() => new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const PAGE_SIZE = 12;
  const navigate = useNavigate();


  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q, sort, type, minRating, maxPrice, amenities]);

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

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
        };

        // q -> backend "q"
        if (q.trim()) params.q = q.trim();

        // type -> backend enum (lowercase)
        if (type !== "all") params.type = type; // vezi TYPES mai jos

        // maxPrice -> backend priceMax
        if (maxPrice != null) params.priceMax = String(maxPrice);

        // minRating: backend nu are filtru rating acum; îl filtrăm în FE după fetch
        // amenities -> backend "facilities" CSV
        if (amenities.size > 0)
          params.facilities = Array.from(amenities).join(",");

        const data = await listStays(params);
        if (!alive) return;

        // aplicăm minRating în FE (temporar) – până adaugi în backend dacă vrei
        const filteredByRating = (data.items || []).filter(
          (s) => (s.rating || 0) >= minRating
        );
        console.log("FIRST ITEM:", (data.items || [])[0]);

        setResults(filteredByRating);
        setTotal(data.total ?? filteredByRating.length);
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
  }, [q, sort, type, minRating, maxPrice, amenities, page]);



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
    setMinRating(0);
    setMaxPrice(600);
    setAmenities(new Set());
  };

  const openStay = (stay) => {
    const stayId = stay?._id || stay?.id;
    if (!stayId) return;
  
    navigate(`/cazari/${stayId}`);
    window.scrollTo({ top: 0, behavior: "smooth" }); // opțional, dar nice
  };
  

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const Filters = (
    <aside className="filtersCard">
      <div className="filtersHeader">
        <div>
          <h3 className="filtersTitle">Filtre</h3>
          <p className="filtersSub">Rafinează rezultatele rapid.</p>
        </div>
        <button className="linkBtn" type="button" onClick={clearFilters}>
          Resetează
        </button>
      </div>

      <div className="filterBlock">
        <label className="label">Tip cazare</label>
        <div className="chips">
          <button
            className={`chip ${type === "all" ? "active" : ""}`}
            type="button"
            onClick={() => setType("all")}
          >
            Toate
          </button>
          {TYPES.map((t) => (
            <button
              key={t.value}
              className={`chip ${type === t.value ? "active" : ""}`}
              type="button"
              onClick={() => setType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filterBlock">
        <div className="rowBetween">
          <label className="label">Rating minim</label>
          <span className="pillSmall">{minRating.toFixed(1)}+</span>
        </div>
        <input
          className="range"
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={minRating}
          onChange={(e) =>
            setMinRating(clamp(parseFloat(e.target.value), 0, 5))
          }
        />
      </div>

      <div className="filterBlock">
        <div className="rowBetween">
          <label className="label">Preț maxim / noapte</label>
          <span className="pillSmall">{maxPrice} RON</span>
        </div>
        <input
          className="range"
          type="range"
          min="100"
          max="800"
          step="10"
          value={maxPrice}
          onChange={(e) =>
            setMaxPrice(clamp(parseInt(e.target.value, 10), 100, 800))
          }
        />
      </div>

      <div className="filterBlock">
        <label className="label">Facilități</label>
        <div className="checkGrid">
          {AMENITIES.map((a) => (
            <label className="check" key={a.key}>
              <input
                type="checkbox"
                checked={amenities.has(a.key)}
                onChange={() => toggleAmenity(a.key)}
              />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className={`staysPage ${mobileFiltersOpen ? "filtersOpen" : ""}`}>
      <div className="stays-hero">
        <div className="heroInner">
          <div className="heroTop">
            <div className="heroText">
              <h1>Cazări în Bucovina</h1>

              <div className="heroMeta">
                <span className="metaItem">
                  <MapPin size={16} />
                  Bucovina
                </span>

                <span className="metaDot" aria-hidden="true">
                  •
                </span>

                <span className="metaItem">
                  <Sparkles size={16} />
                  Cabane, pensiuni, apartamente
                </span>

                <span className="metaDot" aria-hidden="true">
                  •
                </span>

                <span className="metaPill">
                  <strong>{total}</strong> rezultate
                </span>
              </div>
            </div>
          </div>

          {/* Unified Control Bar */}
          <div className="controlsCard">
            <div className="controlsRow">
              <div className="searchField">
                <Search size={18} className="fieldIcon" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Caută după nume, locație, tip..."
                  aria-label="Caută cazări"
                />
                {q?.length > 0 && (
                  <button
                    className="clearBtn"
                    type="button"
                    onClick={() => setQ("")}
                    aria-label="Șterge căutarea"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                className="filterBtn"
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal size={18} />
                <span className="filterBtnText">Filtre</span>
              </button>

              <div className="sortField">
                <ArrowUpDown size={18} className="fieldIcon" />
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sortează"
                >
                  <option value="recommended">Recomandate</option>
                  <option value="ratingDesc">Rating (desc)</option>
                  <option value="priceAsc">Preț (cresc)</option>
                  <option value="priceDesc">Preț (desc)</option>
                </select>
              </div>
            </div>

            {/* optional: little hint row */}
            <div className="controlsHint">
              Tip: folosește filtrele pentru tip, rating și preț.
            </div>
          </div>
        </div>
      </div>

      <main className="content">
        <div className="desktopFilters">{Filters}</div>

        <section className="results">
          {loading ? (
            <div className="empty">
              <h3>Se încarcă...</h3>
              <p>Aducem cele mai noi cazări disponibile.</p>
            </div>
          ) : err ? (
            <div className="empty">
              <h3>Eroare</h3>
              <p>{err}</p>
              <button
                className="primaryBtn"
                type="button"
                onClick={() => window.location.reload()}
              >
                Reîncearcă
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="empty">
              <h3>Nimic găsit</h3>
              <p>Încearcă să schimbi filtrele sau să cauți altceva.</p>
              <button
                className="primaryBtn"
                type="button"
                onClick={clearFilters}
              >
                Resetează filtrele
              </button>
            </div>
          ) : (
            <>
              <div className="cards">
                {results.map((s) => (
                  <StayCard key={s.id} stay={s} onOpen={openStay} />
                ))}
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button
                  className="pageBtn"
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Înapoi
                </button>

                <div className="pageInfo">
                  Pagina <strong>{page}</strong> din{" "}
                  <strong>{totalPages}</strong>
                </div>

                <button
                  className="pageBtn"
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
      <div
        className={`drawerOverlay ${mobileFiltersOpen ? "open" : ""}`}
        onClick={() => setMobileFiltersOpen(false)}
      />
      <div
        className={`drawer ${mobileFiltersOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawerTop">
          <h3>Filtre</h3>
          <button
            className="iconBtn"
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className="drawerBody">{Filters}</div>
        <div className="drawerBottom">
          <button className="ghostBtn" type="button" onClick={clearFilters}>
            Resetează
          </button>
          <button
            className="btn btn-primary btn-see-results"
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
          >
            Vezi {results.length} rezultate
          </button>
        </div>
      </div>
    </div>
  );
}
