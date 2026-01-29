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
import { useTranslation } from "react-i18next";

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
  { key: "view", labelKey: "trails.tags.view" },
  { key: "family", labelKey: "trails.tags.family" },
  { key: "forest", labelKey: "trails.tags.forest" },
  { key: "alpine", labelKey: "trails.tags.alpine" },
  { key: "nature", labelKey: "trails.tags.nature" },
];

function tagLabel(tag, t) {
  // în UI: label “frumos”, fără să schimbi tag-ul din data
  const map = {
    view: "trails.tagLabels.view",
    family: "trails.tagLabels.family",
    forest: "trails.tagLabels.forest",
    ridge: "trails.tagLabels.ridge",
    alpine: "trails.tagLabels.alpine",
    long: "trails.tagLabels.long",
    relax: "trails.tagLabels.relax",
    nature: "trails.tagLabels.nature",
  };
  const k = map[tag];
  return k ? t(k) : tag;
}

// preview fallback (până ai imagini reale)
function previewSeed(t) {
  const base = (t.id || t.name).replace(/\s+/g, "-").toLowerCase();
  return `https://picsum.photos/seed/trail-${base}/900/600`;
}

// EN<->RO difficulty mapping (pentru filtrare corectă dacă UI e în EN)
const DIFF_UI = {
  ro: ["Toate", "Ușor", "Mediu", "Greu"],
  en: ["All", "Easy", "Moderate", "Hard"],
};
const DIFF_TO_RO = {
  All: "Toate",
  Easy: "Ușor",
  Moderate: "Mediu",
  Hard: "Greu",
  Toate: "Toate",
  "Ușor": "Ușor",
  "Mediu": "Mediu",
  "Greu": "Greu",
};

export default function Trails() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const [q, setQ] = useState("");
  const [diff, setDiff] = useState(isEn ? "All" : "Toate");
  const [sort, setSort] = useState("recomandate");
  const [chip, setChip] = useState("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    // IMPORTANT: data e în RO (Ușor/Mediu/Greu). Convertim selecția UI -> RO.
    const diffRo = DIFF_TO_RO[diff] || "Toate";

    let list = TRAILS.filter((tr) => {
      const name = String(tr.name || "").toLowerCase();
      const area = String(tr.area || "").toLowerCase();

      const matchQ = !query || name.includes(query) || area.includes(query);
      const matchDiff = diffRo === "Toate" ? true : tr.difficulty === diffRo;
      const matchChip = chip === "all" ? true : (tr.tags || []).includes(chip);

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

  const diffOptions = isEn ? DIFF_UI.en : DIFF_UI.ro;

  return (
    <main className="tr-page">
      <div className="tr-heroTop" aria-hidden="true">
        <img src={heroArt} alt="" className="tr-heroTopImg" />
      </div>

      <div className="container tr-container">
        <header className="tr-head">
          <div className="tr-headTop">
            <div>
              <h1 className="tr-title">{t("trails.title")}</h1>
              <p className="tr-subtitle text-muted">
                {t("trails.subtitle")}
              </p>
            </div>

            <div className="tr-count" title={t("trails.countTitle")}>
              <Sparkles size={16} />
              <span>{t("trails.results", { count: filtered.length })}</span>
            </div>
          </div>

          <img className="tr-headArt" src={headerArt} alt="" aria-hidden="true" />

          {/* STICKY controls */}
          <div className="tr-controls">
            <div className="tr-search">
              <Search size={18} />
              <input
                className="tr-input"
                placeholder={t("trails.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label={t("trails.searchAria")}
              />
            </div>

            <div className="tr-filters">
              <div className="tr-select">
                <Filter size={16} />
                <select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label={t("trails.filterDifficulty")}>
                  {diffOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="tr-select">
                <TrendingUp size={16} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("trails.sortAria")}>
                  <option value="recomandate">{t("trails.sort.recommended")}</option>
                  <option value="durata">{t("trails.sort.duration")}</option>
                  <option value="dificultate">{t("trails.sort.difficulty")}</option>
                </select>
              </div>
            </div>

            <div className="tr-chips" role="tablist" aria-label={t("trails.quickFilters")}>
              <button
                className={`tr-chip ${chip === "all" ? "is-active" : ""}`}
                onClick={() => setChip("all")}
              >
                {t("trails.all")}
              </button>
              {CHIP_TAGS.map((x) => (
                <button
                  key={x.key}
                  className={`tr-chip ${chip === x.key ? "is-active" : ""}`}
                  onClick={() => setChip(x.key)}
                >
                  {t(x.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="tr-grid" aria-label={t("trails.listAria")}>
          {filtered.map((tr) => (
            <article
              key={tr.id}
              className="tr-card"
              onClick={() => window.open(tr.url, "_blank", "noopener,noreferrer")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  window.open(tr.url, "_blank", "noopener,noreferrer");
                }
              }}
              aria-label={t("trails.openGuideAria", { name: tr.name })}
            >
              <div className="tr-media">
                <img
                  src={tr.image || previewSeed(tr)}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="tr-mediaOverlay" />
                <div className="tr-cardTop">
                  <span className={`tr-pill ${pillForDifficulty(tr.difficulty)}`}>
                    {/* badge difficulty: tradus doar în UI */}
                    {t(`trails.difficulty.${tr.difficulty}`, { defaultValue: tr.difficulty })}
                  </span>

                  <a
                    className="tr-open"
                    href={tr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("trails.openGuideTitle")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>

              <div className="tr-body">
                <h3 className="tr-card-title">{tr.name}</h3>

                <div className="tr-meta">
                  <span className="tr-meta-item">
                    <MapPin size={16} />
                    {tr.area}
                  </span>
                  <span className="tr-meta-item">
                    <Timer size={16} />
                    {t("trails.meta.durationDistance", { hours: tr.durationHrs, km: tr.distanceKm })}
                  </span>
                </div>

                <div className="tr-tags">
                  {(tr.tags || []).slice(0, 3).map((tag) => (
                    <span key={tag} className="tr-tag">
                      {tagLabel(tag, t)}
                    </span>
                  ))}
                  <span className="tr-season">{tr.season}</span>
                </div>

                <div className="tr-ctaRow">
                  <span className="tr-hint">
                    <ImageIcon size={16} />
                    {t("trails.openGuideHint")}
                  </span>
                  <span className="tr-ctaMini">
                    {t("trails.see")} <ExternalLink size={16} />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </section>

        {filtered.length === 0 ? (
          <div className="ui-empty tr-empty">{t("trails.empty")}</div>
        ) : null}
      </div>
    </main>
  );
}
