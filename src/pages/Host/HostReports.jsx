import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../stores/authStore";
import { getHostOverview, getHostListingsStats } from "../../api/hostReportsService";
import { getMyProperties } from "../../api/hostListingsService";
import "./HostReports.css";

import {
  BarChart3, Eye, MousePointerClick, Percent, MessageSquareText,
  ExternalLink, Download, Filter, Clock3, Search,
  ArrowLeft, ArrowRight, Sparkles, X,
  ChevronUp, ChevronDown, TrendingUp,
  Star, AlertCircle, Info,
} from "lucide-react";

const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">` +
    `<rect width="100%" height="100%" fill="#f3f4f6"/>` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="18" fill="#9ca3af">BucovinaStay</text>` +
    `</svg>`
  );

/* ─── utils ─────────────────────────────────────────── */
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function formatPct(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(1).replace(".", ",")}%`;
}

function safeDiv(a, b) {
  const x = Number(a), y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) return 0;
  return x / y;
}

function shortDayLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

function buildCsv(rows) {
  const esc = (s) => `"${String(s ?? "").replaceAll('"', '""')}"`;
  const head = ["ListingId", "Titlu", "Status", "Vizualizari", "Click-uri", "CTR"];
  const body = rows.map((r) =>
    [r.id, r.title, r.status, r.views, r.clicks, r.ctr].map(esc).join(",")
  );
  return [head.join(","), ...body].join("\n");
}

function ctrTone(ctr) {
  if (ctr >= 3)  return "good";
  if (ctr >= 1)  return "warn";
  if (ctr > 0)   return "bad";
  return "muted";
}

/* ─── Sparkline ──────────────────────────────────────── */
function Sparkline({ values = [], accent = false }) {
  const valid = values.filter(Number.isFinite);
  if (valid.length < 2) return <div className="hrSparkEmpty" />;

  const W = 96, H = 30;
  const max = Math.max(...valid) || 1;

  const pts = valid.map((v, i) => {
    const x = (i / (valid.length - 1)) * W;
    const y = H - clamp((v / max) * (H - 4), 0, H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const stroke = accent ? "var(--host-chart-line-2)" : "var(--host-chart-line)";

  return (
    <svg
      className="hrSparkSvg"
      viewBox={`0 0 ${W} ${H}`}
      width={W} height={H}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── SortIcon ───────────────────────────────────────── */
function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <span className="hrSortNone"><ChevronUp size={10} /><ChevronDown size={10} /></span>;
  return sortDir === -1
    ? <ChevronDown size={12} className="hrSortActive" />
    : <ChevronUp size={12} className="hrSortActive" />;
}

/* ─── LineChart (SVG) ────────────────────────────────── */
const VW = 800, VH = 210;
const PAD = { t: 12, r: 16, b: 38, l: 46 };
const IW = VW - PAD.l - PAD.r;
const IH = VH - PAD.t - PAD.b;

function LineChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);

  const { toX, toY, gridLines, labelEvery, imprPts, clicksPts, areaPoints } =
    useMemo(() => {
      if (!data?.length) return {};

      const maxVal = Math.max(
        Math.max(...data.map((d) => d.impressions)),
        Math.max(...data.map((d) => d.clicks)),
        1
      );
      const niceMax = Math.ceil((maxVal * 1.15) / 5) * 5 || 10;

      const toX = (i) => PAD.l + (i / Math.max(data.length - 1, 1)) * IW;
      const toY = (v) => PAD.t + IH - (v / niceMax) * IH;

      const gridLines = [0.25, 0.5, 0.75, 1].map((f) => ({
        y: toY(niceMax * f),
        label: Math.round(niceMax * f),
      }));

      const labelEvery =
        data.length <= 7  ? 1 :
        data.length <= 14 ? 2 :
        data.length <= 31 ? 5 :
        data.length <= 90 ? 10 : 30;

      const imprPts   = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.impressions).toFixed(1)}`).join(" ");
      const clicksPts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.clicks).toFixed(1)}`).join(" ");

      const areaPoints = [
        ...data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.impressions).toFixed(1)}`),
        `${toX(data.length - 1).toFixed(1)},${(PAD.t + IH).toFixed(1)}`,
        `${PAD.l.toFixed(1)},${(PAD.t + IH).toFixed(1)}`,
      ].join(" ");

      return { toX, toY, gridLines, labelEvery, imprPts, clicksPts, areaPoints };
    }, [data]);

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current || !data?.length || !toX) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VW;
    let closest = 0, minD = Infinity;
    data.forEach((_, i) => {
      const d = Math.abs(toX(i) - svgX);
      if (d < minD) { minD = d; closest = i; }
    });
    setHovered(closest);
  }, [data, toX]);

  if (!data?.length) {
    return (
      <div className="hrChartEmpty">
        <BarChart3 size={28} />
        <span>Nu există date pentru perioada selectată</span>
      </div>
    );
  }

  const h = hovered !== null ? data[hovered] : null;

  return (
    <div className="hrLineChart" onMouseLeave={() => setHovered(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%" height="100%"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        style={{ display: "block" }}
      >
        {/* grid */}
        {gridLines?.map((g, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={g.y} x2={VW - PAD.r} y2={g.y}
              stroke="var(--host-chart-grid)" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.l - 6} y={g.y} textAnchor="end" dominantBaseline="middle"
              fontSize="10" fill="var(--host-chart-axis)" fontFamily="inherit">{g.label}</text>
          </g>
        ))}

        {/* area fill — impressions */}
        <polygon points={areaPoints} fill="var(--host-chart-area-top)" />

        {/* impressions line */}
        <polyline points={imprPts} fill="none"
          stroke="var(--host-chart-line)" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* clicks line */}
        <polyline points={clicksPts} fill="none"
          stroke="var(--host-chart-line-2)" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text key={d.day} x={toX(i).toFixed(1)} y={VH - PAD.b + 16}
              textAnchor="middle" fontSize="10" fill="var(--host-chart-axis-2)"
              fontFamily="inherit">
              {shortDayLabel(d.day)}
            </text>
          );
        })}

        {/* hover line + dots */}
        {h && hovered !== null && (() => {
          const x = toX(hovered);
          return (
            <g>
              <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + IH}
                stroke="var(--host-chart-hover)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={x} cy={toY(h.impressions)} r="4.5"
                fill="var(--host-chart-dot)" stroke="var(--host-chart-dot-stroke)" strokeWidth="1.5" />
              <circle cx={x} cy={toY(h.clicks)} r="4.5"
                fill="var(--host-chart-line-2)" stroke="var(--host-chart-dot-stroke)" strokeWidth="1.5" />
            </g>
          );
        })()}
      </svg>

      {/* tooltip */}
      {h && hovered !== null && (
        <div
          className="hrChartTooltip"
          style={{ left: `${(toX(hovered) / VW) * 100}%` }}
        >
          <div className="hrTtDate">{shortDayLabel(h.day)}</div>
          <div className="hrTtRow">
            <span className="hrTtDot" />
            Vizualizări <b>{h.impressions}</b>
          </div>
          <div className="hrTtRow">
            <span className="hrTtDot accent" />
            Click-uri <b>{h.clicks}</b>
          </div>
          {h.impressions > 0 && (
            <div className="hrTtRow muted">
              CTR <b>{formatPct(safeDiv(h.clicks, h.impressions) * 100)}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── TopPerformer ───────────────────────────────────── */
function TopPerformer({ rows, range }) {
  const top = useMemo(() => {
    const candidates = (rows || []).filter((r) => r.views >= 5);
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => b.ctr - a.ctr)[0];
  }, [rows]);

  if (!top) return null;

  return (
    <div className="hrTopPerformer">
      <div className="hrTopIcon"><Star size={15} /></div>
      <div className="hrTopBody">
        <div className="hrTopLabel">Top performer • {range}</div>
        <div className="hrTopName">{top.title}</div>
      </div>
      <div className="hrTopStats">
        <span><b>{top.views}</b> vizualizări</span>
        <span className="hrTopCtr">CTR <b>{formatPct(top.ctr)}</b></span>
      </div>
    </div>
  );
}

/* ─── Insights generation ────────────────────────────── */
function generateInsights(rows, kpis, daily) {
  const out = [];

  const withViews = (rows || []).filter((r) => r.views >= 5);
  if (!withViews.length && !kpis?.impressions) return out;

  // Best CTR
  if (withViews.length > 0) {
    const best = [...withViews].sort((a, b) => b.ctr - a.ctr)[0];
    out.push({
      tone: "good",
      text: `„${best.title}" are cel mai bun CTR (${formatPct(best.ctr)}) — fotografiile și titlul acesteia pot fi modelul pentru restul proprietăților.`,
    });
  }

  // Zero clicks with significant views
  const dead = (rows || []).filter((r) => r.views >= 20 && r.clicks === 0);
  if (dead.length > 0) {
    const names = dead.length === 1 ? `„${dead[0].title}"` : `${dead.length} proprietăți`;
    out.push({
      tone: "warn",
      text: `${names} ${dead.length === 1 ? "are" : "au"} vizualizări semnificative dar 0 click-uri — verifică dacă numărul de telefon sau WhatsApp este vizibil în pagina proprietății.`,
    });
  }

  // Overall CTR
  const avgCtr = Number(kpis?.ctr ?? 0);
  if (kpis?.impressions > 0) {
    if (avgCtr >= 3)
      out.push({ tone: "good", text: `CTR mediu de ${formatPct(avgCtr)} este excelent (≥ 3%). Anunțurile tale atrag interes real.` });
    else if (avgCtr >= 1)
      out.push({ tone: "info", text: `CTR mediu de ${formatPct(avgCtr)} e decent. O fotografie de cover mai atractivă poate îmbunătăți rata de click.` });
    else
      out.push({ tone: "warn", text: `CTR mediu de ${formatPct(avgCtr)} este scăzut (< 1%). Prima fotografie și titlul contează cel mai mult — încearcă variante diferite.` });
  }

  // Trend: compare first vs second half
  const arr = daily || [];
  if (arr.length >= 6) {
    const half = Math.floor(arr.length / 2);
    const first = arr.slice(0, half).reduce((s, d) => s + d.impressions, 0);
    const second = arr.slice(half).reduce((s, d) => s + d.impressions, 0);
    if (first > 0) {
      const pct = Math.round(((second - first) / first) * 100);
      if (pct > 10)
        out.push({ tone: "good", text: `Tendință pozitivă: vizualizările au crescut cu ~${pct}% în a doua jumătate a perioadei.` });
      else if (pct < -10)
        out.push({ tone: "warn", text: `Tendință negativă: vizualizările au scăzut cu ~${Math.abs(pct)}% în a doua jumătate — poate fi sezonier, dar merită verificat.` });
    }
  }

  // Best day
  if (arr.length > 0) {
    const best = [...arr].sort((a, b) => b.impressions - a.impressions)[0];
    if (best?.impressions > 0) {
      out.push({
        tone: "info",
        text: `Ziua cu cel mai mult trafic a fost ${shortDayLabel(best.day)} — ${best.impressions} vizualizări${best.clicks > 0 ? `, ${best.clicks} click-uri` : ""}.`,
      });
    }
  }

  // Worst performer (with enough data)
  if (withViews.length >= 2) {
    const worst = [...withViews].sort((a, b) => a.ctr - b.ctr)[0];
    if (worst.ctr < 1 && worst.id !== withViews.sort((a, b) => b.ctr - a.ctr)[0]?.id) {
      out.push({
        tone: "warn",
        text: `„${worst.title}" are cel mai slab CTR (${formatPct(worst.ctr)}) din proprietățile active. Prioritizează îmbunătățirea fotografiei principale.`,
      });
    }
  }

  return out;
}

/* ─── InsightsPanel ──────────────────────────────────── */
const TONE_ICON = {
  good: <TrendingUp size={15} />,
  warn: <AlertCircle size={15} />,
  info: <Info size={15} />,
};

function InsightsPanel({ open, onClose, rows, kpis, daily, range }) {
  const insights = useMemo(
    () => generateInsights(rows, kpis, daily, range),
    [rows, kpis, daily, range]
  );

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="hrInsightsRoot" role="dialog" aria-modal="true">
      <button className="hrInsightsBdrop" onClick={onClose} aria-label="Închide" />
      <aside className="hrInsightsPanel">
        <div className="hrInsightsHead">
          <div>
            <div className="hrInsightsTitle">Insights</div>
            <div className="hrInsightsSub">{range} • {(rows || []).length} proprietăți analizate</div>
          </div>
          <button className="hrInsightsClose" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="hrInsightsList">
          {insights.length === 0 ? (
            <div className="hrInsightsEmpty">
              <BarChart3 size={24} />
              <span>Nu există suficiente date pentru insights în perioada selectată.</span>
            </div>
          ) : (
            insights.map((ins, i) => (
              <div key={i} className={`hrInsightItem tone-${ins.tone}`}>
                <div className="hrInsightIcon">{TONE_ICON[ins.tone] ?? <Info size={15} />}</div>
                <div className="hrInsightText">{ins.text}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────── */
export default function HostReports() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [range, setRange]         = useState("30d");
  const [q, setQ]                 = useState("");
  const [onlyLive, setOnlyLive]   = useState(false);
  const [page, setPage]           = useState(1);
  const [sortBy, setSortBy]       = useState("views");
  const [sortDir, setSortDir]     = useState(-1);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const LIMIT = 12;

  const [loading, setLoading]     = useState(true);
  const [overview, setOverview]   = useState(null);
  const [byListingId, setByListingId] = useState({});
  const [props, setProps]         = useState([]);

  if (!user) return null;
  if (user.role !== "host" && user.role !== "admin") return null;

  const hostName = user?.name || user?.email?.split("@")?.[0] || "Host";

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => -d);
    else { setSortBy(col); setSortDir(-1); }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [ov, ls, my] = await Promise.all([
          getHostOverview({ range }),
          getHostListingsStats({ range }),
          getMyProperties({ page: 1, limit: 200, status: "all", q: "" }),
        ]);
        if (!alive) return;
        setOverview(ov);
        setByListingId(ls?.byListingId || {});
        setProps((my?.items || []).map((p) => ({ ...p, _id: p._id || p.id })));
      } catch (e) {
        if (!alive) return;
        toast.error("Nu am putut încărca rapoartele", { description: e?.message });
        setOverview(null); setByListingId({}); setProps([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  useEffect(() => setPage(1), [range, q, onlyLive, sortBy, sortDir]);

  const daily = useMemo(() => {
    const arr = Array.isArray(overview?.daily) ? overview.daily : [];
    return arr.map((x) => ({
      day: x.day,
      impressions: Number(x.impressions || 0),
      clicks: Number(x.clicks || 0),
    }));
  }, [overview]);

  const kpis = useMemo(() => {
    const impressions = Number(overview?.impressions ?? 0);
    const clicks      = Number(overview?.clicks ?? 0);
    const ctr         = Number(overview?.ctr ?? 0);
    const wa    = Number(overview?.clickActions?.contact_whatsapp ?? 0);
    const phone = Number(overview?.clickActions?.contact_phone ?? 0);
    const sms   = Number(overview?.clickActions?.contact_sms ?? 0);
    return { impressions, clicks, ctr, wa, phone, sms };
  }, [overview]);

  const sparkImpr   = useMemo(() => daily.map((d) => d.impressions), [daily]);
  const sparkClicks = useMemo(() => daily.map((d) => d.clicks), [daily]);
  const sparkCtr    = useMemo(() => daily.map((d) => safeDiv(d.clicks, d.impressions) * 100), [daily]);

  const allRows = useMemo(() => {
    return (props || []).map((p) => {
      const id = String(p._id || p.id);
      const s = byListingId?.[id] || {};
      const views  = Number(s.views30  ?? s.views  ?? 0);
      const clicks = Number(s.clicks30 ?? s.clicks ?? 0);
      return {
        id, views, clicks,
        ctr:   safeDiv(clicks, views) * 100,
        title: p.title || "Fără titlu",
        status: p.status || "—",
        city:  p.city || p.locality || "—",
        type:  p.type || "—",
        thumb: p.coverImage?.url || p.images?.[0]?.url || FALLBACK_IMG,
      };
    });
  }, [props, byListingId]);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = allRows;
    if (onlyLive) out = out.filter((r) => r.status === "live");
    if (needle)   out = out.filter((r) =>
      r.title.toLowerCase().includes(needle) ||
      r.city.toLowerCase().includes(needle) ||
      r.type.toLowerCase().includes(needle)
    );
    out = [...out].sort((a, b) => {
      if (sortBy === "title") return sortDir * a.title.localeCompare(b.title);
      return sortDir * ((b[sortBy] ?? 0) - (a[sortBy] ?? 0));
    });
    return out;
  }, [allRows, q, onlyLive, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / LIMIT));
  const pageRows   = useMemo(() => {
    const s = (page - 1) * LIMIT;
    return filteredRows.slice(s, s + LIMIT);
  }, [filteredRows, page]);

  const onExportCsv = () => {
    try {
      const csv = buildCsv(filteredRows.map((r) => ({ ...r, ctr: formatPct(r.ctr) })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `rapoarte-${range}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Nu am putut exporta CSV"); }
  };

  const COLS = [
    { key: "title",  label: "Proprietate" },
    { key: "status", label: "Status",      noSort: true },
    { key: "views",  label: "Vizualizări" },
    { key: "clicks", label: "Click-uri" },
    { key: "ctr",    label: "CTR" },
  ];

  return (
    <div className="hrPage">
      <div className="hrMain">

        {/* ── Header ── */}
        <header className="hrHeader">
          <div className="hrCrumb">Gazdă</div>
          <div className="hrTitleRow">
            <h1 className="hrTitle">Rapoarte</h1>
            <button className="hrGhostLink" type="button" onClick={() => navigate("/host/listings")}>
              Proprietăți <ExternalLink size={16} />
            </button>
          </div>
          <div className="hrSub">
            Salut, <strong>{hostName}</strong> — performanța anunțurilor în perioada selectată.
          </div>
        </header>

        {/* ── Toolbar ── */}
        <div className="hrToolbar">
          <div className="hrFilters">
            <div className="hrSelect">
              <Clock3 size={15} />
              <select value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="7d">7 zile</option>
                <option value="30d">30 zile</option>
                <option value="90d">90 zile</option>
                <option value="365d">365 zile</option>
              </select>
            </div>

            <button
              className={`hrSelect${onlyLive ? " isActive" : ""}`}
              type="button"
              onClick={() => setOnlyLive((v) => !v)}
            >
              <Filter size={15} /> Doar live
            </button>

            <div className="hrSearch" role="search">
              <Search size={15} className="hrSearchIcon" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Caută titlu / oraș / tip…"
                aria-label="Caută în rapoarte"
              />
            </div>
          </div>

          <div className="hrActions">
            <button className="hrChip" type="button" onClick={onExportCsv}>
              <Download size={15} /> Export CSV
            </button>
            <button
              className="hrChip hrChipAccent"
              type="button"
              onClick={() => setInsightsOpen(true)}
            >
              <Sparkles size={15} /> Insights
            </button>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="hrKpis">
          <div className="hrCard">
            <div className="hrCardTop">
              <div className="hrCardLabel">Vizualizări</div>
              <div className="hrCardMini"><Eye size={17} /></div>
            </div>
            <div className="hrCardValue">{loading ? "—" : kpis.impressions.toLocaleString("ro-RO")}</div>
            <div className="hrCardHint">în {range}</div>
            <Sparkline values={sparkImpr} />
          </div>

          <div className="hrCard">
            <div className="hrCardTop">
              <div className="hrCardLabel">Click-uri</div>
              <div className="hrCardMini"><MousePointerClick size={17} /></div>
            </div>
            <div className="hrCardValue">{loading ? "—" : kpis.clicks.toLocaleString("ro-RO")}</div>
            <div className="hrCardHint">telefon / WhatsApp / SMS</div>
            <Sparkline values={sparkClicks} accent />
          </div>

          <div className="hrCard">
            <div className="hrCardTop">
              <div className="hrCardLabel">CTR</div>
              <div className="hrCardMini"><Percent size={17} /></div>
            </div>
            <div className={`hrCardValue tone-${ctrTone(kpis.ctr)}`}>
              {loading ? "—" : formatPct(kpis.ctr)}
            </div>
            <div className="hrCardHint">click-uri / vizualizări</div>
            <Sparkline values={sparkCtr} accent />
          </div>

          <div className="hrCard">
            <div className="hrCardTop">
              <div className="hrCardLabel">Canale contact</div>
              <div className="hrCardMini"><MessageSquareText size={17} /></div>
            </div>
            <div className="hrCardValue">{loading ? "—" : (kpis.wa + kpis.phone + kpis.sms).toLocaleString("ro-RO")}</div>
            <div className="hrCardHint">WA {kpis.wa} · Tel {kpis.phone} · SMS {kpis.sms}</div>
            <Sparkline values={sparkClicks} />
          </div>
        </div>

        {/* ── Chart ── */}
        <section className="hrCard hrChartCard">
          <div className="hrCardTop">
            <div>
              <div className="hrCardLabel">Trend zilnic</div>
              <div className="hrTiny">Vizualizări vs click-uri · hover pe grafic pentru detalii</div>
            </div>
            <div className="hrLegend">
              <span className="hrLegDot" /> Vizualizări
              <span className="hrLegDot accent" /> Click-uri
            </div>
          </div>
          <div className="hrChartWrap">
            {loading
              ? <div className="hrSkeleton"><div className="skLine"/><div className="skLine"/><div className="skLine"/></div>
              : <LineChart data={daily} />
            }
          </div>
        </section>

        {/* ── Top performer ── */}
        {!loading && <TopPerformer rows={filteredRows} range={range} />}

        {/* ── Table ── */}
        <section className="hrCard hrTableCard">
          <div className="hrCardTop">
            <div>
              <div className="hrCardLabel">Performanță pe proprietăți</div>
              <div className="hrTiny">{filteredRows.length} rezultate</div>
            </div>
            <div className="hrCardMini"><BarChart3 size={17} /></div>
          </div>

          <div className="hrTableHead">
            {COLS.map((c) => (
              <button
                key={c.key}
                className={`hrThBtn${!c.noSort ? " sortable" : ""}`}
                type="button"
                onClick={() => !c.noSort && toggleSort(c.key)}
                disabled={!!c.noSort}
              >
                {c.label}
                {!c.noSort && <SortIcon col={c.key} sortBy={sortBy} sortDir={sortDir} />}
              </button>
            ))}
            <div />
          </div>

          {loading ? (
            <div className="hrSkeleton"><div className="skLine"/><div className="skLine"/><div className="skLine"/></div>
          ) : pageRows.length === 0 ? (
            <div className="hrEmpty">
              <div className="hrEmptyTitle">Nimic de afișat</div>
              <div className="hrMuted">Încearcă alt interval sau un alt termen de căutare.</div>
            </div>
          ) : (
            <div className="hrRows">
              {pageRows.map((r) => (
                <div className="hrRow" key={r.id}>
                  <div className="hrProp">
                    <img className="hrThumb" src={r.thumb} alt="" loading="lazy" />
                    <div className="hrPropText">
                      <div className="hrPropName" title={r.title}>{r.title}</div>
                      <div className="hrPropMeta">{r.city} · {r.type}</div>
                    </div>
                  </div>

                  <div className="hrCell">
                    <span className={`hrBadge tone-${r.status === "live" ? "good" : r.status === "pending" ? "warn" : r.status === "rejected" ? "bad" : "muted"}`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="hrCell">{r.views.toLocaleString("ro-RO")}</div>
                  <div className="hrCell">{r.clicks.toLocaleString("ro-RO")}</div>

                  <div className="hrCell">
                    <span className={`hrCtrValue tone-${ctrTone(r.ctr)}`}>{formatPct(r.ctr)}</span>
                  </div>

                  <button className="hrLinkBtn" type="button"
                    onClick={() => navigate(`/cazari/${r.id}`)}>
                    Preview →
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredRows.length > 0 && (
            <div className="hrPager">
              <button className="hrBtn ghost" type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}>
                <ArrowLeft size={14} /> Înapoi
              </button>
              <span className="hrPagerText">Pagina <b>{page}</b> din <b>{totalPages}</b></span>
              <button className="hrBtn ghost" type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}>
                Înainte <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>

      </div>

      {/* ── Insights panel ── */}
      <InsightsPanel
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        rows={filteredRows}
        kpis={kpis}
        daily={daily}
        range={range}
      />
    </div>
  );
}
