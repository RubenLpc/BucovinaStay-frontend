import React, { useMemo, useState } from "react";
import {
  ExternalLink,
  Filter,
  MapPin,
  Timer,
  TrendingUp,
  Sparkles,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import "./Trails.css";
import trailsdata from "./trailsData";
import headerArt from "../../assets/header-path-compass.png";
import heroArt from "../../assets/heroart.png";


const TRAILS = trailsdata;

const DIFF_ORDER = { "Ușor": 1, "Mediu": 2, "Greu": 3 };

function pillForDifficulty(d) {
  if (d === "Ușor") return "pill-easy";
  if (d === "Mediu") return "pill-mid";
  return "pill-hard";
}

function smartRank(trail) {
  let s = 0;

  // preferă ușor/mediu
  s += (4 - DIFF_ORDER[trail.difficulty]) * 12;

  // preferă durate 2-6 ore
  const dur = trail.durationHrs ?? 99;
  s += Math.max(0, 8 - dur) * 2.2;

  // preferă distanțe până la ~14km
  const dist = trail.distanceKm ?? 999;
  s += Math.max(0, 14 - dist) * 1.2;

  // tags
  const tags = trail.tags || [];
  if (tags.includes("view")) s += 8;
  if (tags.includes("family")) s += 4;
  if (tags.includes("forest")) s += 2;
  if (tags.includes("alpine")) s += 1;

  // ușor bonus dacă are sezon (prezență de meta)
  if (trail.season) s += 1;

  return s;
}

const CHIP_TAGS = [
  { key: "view", label: "Priveliște" },
  { key: "family", label: "Familie" },
  { key: "forest", label: "Pădure" },
  { key: "alpine", label: "Alpin" },
  { key: "nature", label: "Natură" },
];

function tagLabel(tag) {
  const map = {
    view: "priveliște",
    family: "familie",
    forest: "pădure",
    ridge: "creastă",
    alpine: "alpin",
    long: "lung",
    relax: "relax",
    nature: "natură",
  };
  return map[tag] || tag;
}

// preview fallback (până ai imagini reale)
function previewSeed(t) {
  const base = (t.id || t.name).replace(/\s+/g, "-").toLowerCase();
  return `https://picsum.photos/seed/trail-${base}/900/600`;
}

export default function Trails() {
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState("Toate");
  const [sort, setSort] = useState("recomandate");
  const [chip, setChip] = useState("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = TRAILS.filter((t) => {
      const matchQ =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.area.toLowerCase().includes(query);

      const matchDiff = diff === "Toate" ? true : t.difficulty === diff;

      const matchChip = chip === "all" ? true : (t.tags || []).includes(chip);

      return matchQ && matchDiff && matchChip;
    });

    if (sort === "recomandate") {
      list = [...list].sort((a, b) => smartRank(b) - smartRank(a));
    } else if (sort === "durata") {
      list = [...list].sort((a, b) => (a.durationHrs ?? 999) - (b.durationHrs ?? 999));
    } else if (sort === "dificultate") {
      list = [...list].sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    }

    return list;
  }, [q, diff, sort, chip]);

  return (
    <main className="tr-page">
       <div className="tr-heroTop" aria-hidden="true">
  <img
    src={heroArt}
    alt=""
    className="tr-heroTopImg"
  />
</div>
      <div className="container tr-container">
        <header className="tr-head">
       
          <div className="tr-headTop">
            <div>
              <h1 className="tr-title">Trasee montane</h1>
              <p className="tr-subtitle text-muted">
                Alege un traseu și deschide ghidul într-un tab nou (surse publice/oficiale).
              </p>
            </div>

            <div className="tr-count" title="Număr rezultate">
              <Sparkles size={16} />
              <span>{filtered.length} rezultate</span>
            </div>
          </div>

          <img className="tr-headArt" src={headerArt} alt="" aria-hidden="true" />


          {/* STICKY controls */}
          <div className="tr-controls">
            <div className="tr-search">
              <Search size={18} />
              <input
                className="tr-input"
                placeholder="Caută: Rarău, Călimani, Vatra Dornei..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="tr-filters">
              <div className="tr-select">
                <Filter size={16} />
                <select value={diff} onChange={(e) => setDiff(e.target.value)}>
                  <option>Toate</option>
                  <option>Ușor</option>
                  <option>Mediu</option>
                  <option>Greu</option>
                </select>
              </div>

              <div className="tr-select">
                <TrendingUp size={16} />
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recomandate">Recomandate</option>
                  <option value="durata">Durată (mică → mare)</option>
                  <option value="dificultate">Dificultate (ușor → greu)</option>
                </select>
              </div>
            </div>

            <div className="tr-chips" role="tablist" aria-label="Filtre rapide">
              <button
                className={`tr-chip ${chip === "all" ? "is-active" : ""}`}
                onClick={() => setChip("all")}
              >
                Toate
              </button>
              {CHIP_TAGS.map((x) => (
                <button
                  key={x.key}
                  className={`tr-chip ${chip === x.key ? "is-active" : ""}`}
                  onClick={() => setChip(x.key)}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="tr-grid" aria-label="Lista trasee">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="tr-card"
              onClick={() => window.open(t.url, "_blank", "noopener,noreferrer")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  window.open(t.url, "_blank", "noopener,noreferrer");
                }
              }}
              aria-label={`Deschide ghidul pentru ${t.name}`}
            >
              <div className="tr-media">
                <img
                  src={t.image || previewSeed(t)}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="tr-mediaOverlay" />
                <div className="tr-cardTop">
                  <span className={`tr-pill ${pillForDifficulty(t.difficulty)}`}>
                    {t.difficulty}
                  </span>

                  <a
                    className="tr-open"
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Deschide ghidul"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>

              <div className="tr-body">
                <h3 className="tr-card-title">{t.name}</h3>

                <div className="tr-meta">
                  <span className="tr-meta-item">
                    <MapPin size={16} />
                    {t.area}
                  </span>
                  <span className="tr-meta-item">
                    <Timer size={16} />
                    {t.durationHrs}h • {t.distanceKm} km
                  </span>
                </div>

                <div className="tr-tags">
                  {(t.tags || []).slice(0, 3).map((tag) => (
                    <span key={tag} className="tr-tag">
                      {tagLabel(tag)}
                    </span>
                  ))}
                  <span className="tr-season">{t.season}</span>
                </div>

                <div className="tr-ctaRow">
                  <span className="tr-hint">
                    <ImageIcon size={16} />
                    Deschide ghidul
                  </span>
                  <span className="tr-ctaMini">
                    Vezi <ExternalLink size={16} />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </section>

        {filtered.length === 0 ? (
          <div className="ui-empty tr-empty">Nu am găsit trasee pentru filtrul ales.</div>
        ) : null}
      </div>
    </main>
  );
}
