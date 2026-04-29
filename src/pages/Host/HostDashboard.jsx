import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { hostDashboardService } from "../../api/hostDashboardService";
import { getHostInbox } from "../../api/hostMessagesService";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import HostInboxModal from "../../components/HostInboxModal/HostInboxModal";
import {
  markHostMessageRead,
  markHostMessageUnread,
  markHostMessagesReadAll,
} from "../../api/hostMessagesService";
import {
  getHostListingsStats,
  getHostOverviewStats,
} from "../../api/analyticsService";
import { toast } from "sonner";
import "./HostDashboard.css";

/* ─── constants ──────────────────────────────────────── */
const STATUS_LABEL = {
  all: "Toate", draft: "Draft", pending: "În așteptare",
  live: "Publicat", paused: "Pauzat", rejected: "Respins",
};

/* ─── MiniSparkline ──────────────────────────────────── */
function MiniSparkline({ data, color = "rgba(255,56,92,0.75)" }) {
  if (!data?.length || data.every((v) => v === 0))
    return <div className="hdSparkEmpty" />;

  const W = 120, H = 32, P = 2;
  const IW = W - P * 2, IH = H - P * 2;
  const max = Math.max(...data, 1);
  const toX = (i) => P + (i / Math.max(data.length - 1, 1)) * IW;
  const toY = (v) => P + IH - (v / max) * IH;
  const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      className="hdSparkSvg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── TrendBadge ─────────────────────────────────────── */
function TrendBadge({ pct }) {
  if (pct == null) return null;
  if (Math.abs(pct) < 4) return <span className="hdTrend flat">±{Math.abs(pct)}%</span>;
  if (pct > 0) return <span className="hdTrend up">↑ {pct}%</span>;
  return <span className="hdTrend down">↓ {Math.abs(pct)}%</span>;
}

/* ─── DashLineChart (SVG) ────────────────────────────── */
const CVW = 800, CVH = 200;
const CPAD = { t: 10, r: 14, b: 34, l: 42 };
const CIW = CVW - CPAD.l - CPAD.r;
const CIH = CVH - CPAD.t - CPAD.b;

function DashLineChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);

  const computed = useMemo(() => {
    if (!data?.length) return null;
    const maxVal = Math.max(
      ...data.map((d) => d.impressions || 0),
      ...data.map((d) => d.clicks || 0),
      1
    );
    const niceMax = Math.ceil((maxVal * 1.15) / 5) * 5 || 10;
    const toX = (i) => CPAD.l + (i / Math.max(data.length - 1, 1)) * CIW;
    const toY = (v) => CPAD.t + CIH - (v / niceMax) * CIH;

    const gridLines = [0.25, 0.5, 0.75, 1].map((f) => ({
      y: toY(niceMax * f),
      label: Math.round(niceMax * f),
    }));

    const labelEvery =
      data.length <= 7  ? 1 :
      data.length <= 14 ? 2 :
      data.length <= 31 ? 5 : 10;

    const imprPts = data
      .map((d, i) => `${toX(i).toFixed(1)},${toY(d.impressions || 0).toFixed(1)}`)
      .join(" ");
    const clicksPts = data
      .map((d, i) => `${toX(i).toFixed(1)},${toY(d.clicks || 0).toFixed(1)}`)
      .join(" ");
    const areaPoints = [
      ...data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.impressions || 0).toFixed(1)}`),
      `${toX(data.length - 1).toFixed(1)},${(CPAD.t + CIH).toFixed(1)}`,
      `${CPAD.l.toFixed(1)},${(CPAD.t + CIH).toFixed(1)}`,
    ].join(" ");

    return { toX, toY, gridLines, labelEvery, imprPts, clicksPts, areaPoints };
  }, [data]);

  const handleMouseMove = useCallback((e) => {
    if (!data?.length || !computed || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * CVW;
    let closest = 0;
    let minD = Infinity;
    data.forEach((_, i) => {
      const d = Math.abs(computed.toX(i) - svgX);
      if (d < minD) {
        minD = d;
        closest = i;
      }
    });
    setHovered(data[closest]);
  }, [computed, data]);

  const formatShortDay = useCallback((day) => {
    if (!day) return "";
    const d = new Date(`${day}T00:00:00`);
    if (Number.isNaN(d.getTime())) return day;
    return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
  }, []);

  if (!data?.length || !computed) {
    return <div className="hdChartEmpty">Nu există date pentru această perioadă</div>;
  }

  const { toX, toY, gridLines, labelEvery, imprPts, clicksPts, areaPoints } = computed;

  const hovIdx = hovered ? data.indexOf(hovered) : -1;
  const xPct = hovIdx >= 0 ? (toX(hovIdx) / CVW * 100) : 0;
  const ctr = hovered ? safeDiv(hovered.clicks, hovered.impressions) * 100 : 0;

  return (
    <div className="hdChartWrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CVW} ${CVH}`}
        width="100%"
        height="100%"
        className="hdLineChart"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="hd-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--host-chart-area-top)" />
            <stop offset="100%" stopColor="var(--host-chart-area-bottom)" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridLines.map(({ y, label }) => (
          <g key={label}>
            <line
              x1={CPAD.l} y1={y} x2={CVW - CPAD.r} y2={y}
              stroke="var(--host-chart-grid)" strokeWidth="1" strokeDasharray="4 3"
            />
            <text
              x={CPAD.l - 6} y={y}
              dominantBaseline="middle"
              textAnchor="end" fontSize="10"
              fill="var(--host-chart-axis)" fontWeight="700"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#hd-area-grad)" />

        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={d.day || i}
              x={toX(i)} y={CVH - CPAD.b + 16}
              textAnchor="middle" fontSize="10"
              fill="var(--host-chart-axis-2)" fontWeight="700"
            >
              {formatShortDay(d.day)}
            </text>
          );
        })}

        {/* Hover vertical line */}
        {hovIdx >= 0 && (
          <line
            x1={toX(hovIdx)} y1={CPAD.t}
            x2={toX(hovIdx)} y2={CPAD.t + CIH}
            stroke="var(--host-chart-hover)" strokeWidth="1" strokeDasharray="3 3"
          />
        )}

        {/* Impressions line */}
        <polyline
          points={imprPts} fill="none"
          stroke="var(--host-chart-line)" strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Clicks line */}
        <polyline
          points={clicksPts} fill="none"
          stroke="var(--host-chart-line-2)" strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Hover dots */}
        {hovIdx >= 0 && (
          <>
            <circle
              cx={toX(hovIdx)} cy={toY(hovered.impressions || 0)}
              r="4.5" fill="var(--host-chart-dot)" stroke="var(--host-chart-dot-stroke)" strokeWidth="1.5"
            />
            <circle
              cx={toX(hovIdx)} cy={toY(hovered.clicks || 0)}
              r="4.5" fill="var(--host-chart-line-2)" stroke="var(--host-chart-dot-stroke)" strokeWidth="1.5"
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && hovIdx >= 0 && (
        <div
          className="hdChartTooltip"
          style={{ left: `${xPct}%` }}
        >
          <div className="hdTtDate">{formatShortDay(hovered.day)}</div>
          <div className="hdTtRow">
            <span className="hdTtDot" style={{ background: "var(--host-chart-dot)" }} />
            Vizualizări <strong>{hovered.impressions || 0}</strong>
          </div>
          <div className="hdTtRow">
            <span className="hdTtDot accent" />
            Click-uri <strong>{hovered.clicks || 0}</strong>
          </div>
          {(hovered.impressions || 0) > 0 && (
            <div className="hdTtRow muted">
              CTR <strong>{formatPct(ctr)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────── */
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function safeDiv(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) return 0;
  return x / y;
}
function formatPct(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(1).replace(".", ",")}%`;
}

function statusTone(s) {
  if (s === "live")     return "good";
  if (s === "pending")  return "warn";
  if (s === "rejected") return "bad";
  return "muted";
}

function halfTrend(daily, key) {
  if (!daily?.length || daily.length < 4) return null;
  const half = Math.floor(daily.length / 2);
  const f = daily.slice(0, half).reduce((s, d) => s + (d[key] || 0), 0);
  const s = daily.slice(half).reduce((s, d) => s + (d[key] || 0), 0);
  if (!f) return null;
  return Math.round(((s - f) / f) * 100);
}

function exportCSV(listings) {
  if (!listings.length) { toast.info("Nu există date de exportat"); return; }
  const header = ["Titlu", "Locație", "Status", "Vizualizări 30z", "Click-uri 30z", "Completare %"];
  const rows = listings.map((p) => [
    p.name || "", p.location || "", p.status || "",
    p.views30 ?? 0, p.clicks30 ?? 0, p.completion ?? 0,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proprietati-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Export reușit", { description: `${listings.length} rânduri exportate.` });
}

/* ─── Page ───────────────────────────────────────────── */
export default function HostDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [inbox, setInbox]             = useState([]);
  const [inboxFilter, setInboxFilter] = useState("unread");
  const [activeMsg, setActiveMsg]     = useState(null);
  const [inboxBusy, setInboxBusy]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [overview, setOverview]       = useState(null);
  const [listingsRes, setListingsRes] = useState({ items: [], total: 0, page: 1, limit: 6 });
  const [status, setStatus]           = useState("all");
  const [q, setQ]                     = useState("");
  const [sort, setSort]               = useState("views_desc");
  const [page, setPage]               = useState(1);
  const [confirm, setConfirm]         = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const limit = 6;

  /* ── derived ── */
  const daily = overview?.daily || [];

  const inboxSorted = useMemo(() => {
    const arr = [...(inbox || [])];
    const filtered = inboxFilter === "unread"
      ? arr.filter((m) => (m.status || "new") === "new")
      : arr;
    return filtered.sort((a, b) => {
      const aNew = (a.status || "new") === "new" ? 0 : 1;
      const bNew = (b.status || "new") === "new" ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      return (b.createdAt ? new Date(b.createdAt).getTime() : 0)
           - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    });
  }, [inbox, inboxFilter]);

  const allListings = listingsRes.items || [];

  const listings = useMemo(() => {
    const arr = [...allListings];
    arr.sort((a, b) => {
      if (sort === "views_desc")      return (b.views30 ?? 0) - (a.views30 ?? 0);
      if (sort === "clicks_desc")     return (b.clicks30 ?? 0) - (a.clicks30 ?? 0);
      if (sort === "completion_desc") return (b.completion ?? 0) - (a.completion ?? 0);
      if (sort === "name_asc")        return String(a.name || "").localeCompare(String(b.name || ""), "ro");
      return 0;
    });
    return arr;
  }, [allListings, sort]);

  const kpis = useMemo(() => {
    const impressions = overview?.impressions ?? 0;
    const clicks      = overview?.clicks      ?? 0;
    const ctr         = overview?.ctr         ?? 0;
    const avgCompletion = listings.length
      ? Math.round(listings.reduce((a, x) => a + (Number(x.completion) || 0), 0) / listings.length)
      : 0;
    const last7 = daily.slice(-7);

    return [
      {
        label: "Vizualizări", value: impressions, hint: "Impressions 30 zile",
        spark: last7.map((d) => d.impressions || 0),
        sparkColor: "rgba(17,24,39,0.60)",
        trend: halfTrend(daily, "impressions"),
      },
      {
        label: "Click-uri contact", value: clicks, hint: "Click-uri 30 zile",
        spark: last7.map((d) => d.clicks || 0),
        sparkColor: "rgba(255,56,92,0.75)",
        trend: halfTrend(daily, "clicks"),
      },
      {
        label: "Completare medie", value: `${avgCompletion}%`, hint: "Calitate anunț",
        spark: null, sparkColor: null, trend: null,
      },
      {
        label: "CTR", value: `${ctr}%`, hint: "Click / vizualizare",
        spark: last7.map((d) =>
          d.impressions > 0 ? +((d.clicks / d.impressions) * 100).toFixed(1) : 0
        ),
        sparkColor: "rgba(16,185,89,0.70)",
        trend: null,
      },
    ];
  }, [overview, listings, daily]);

  const pagesCount = useMemo(
    () => Math.max(1, Math.ceil((Number(listingsRes.total) || 0) / limit)),
    [listingsRes.total]
  );

  /* ── data loading ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsMapRes, overviewRes, inboxRaw] = await Promise.all([
        hostDashboardService.getMyListings({
          page, limit,
          ...(status !== "all" ? { status } : {}),
          ...(q.trim() ? { q: q.trim() } : {}),
        }),
        getHostListingsStats({ range: "30d" }),
        getHostOverviewStats({ range: "30d" }),
        getHostInbox({ limit: 6 }),
      ]);

      setOverview(overviewRes || null);

      const byId = statsMapRes?.byListingId || {};
      const mergedItems = (res?.items || []).map((p) => ({
        ...p,
        views30:  byId[p.id]?.views30  ?? 0,
        clicks30: byId[p.id]?.clicks30 ?? 0,
      }));

      setListingsRes({ items: mergedItems, total: res?.total || 0, page: res?.page || page, limit: res?.limit || limit });
      setInbox(inboxRaw?.items || inboxRaw || []);
    } catch (err) {
      toast.error("Eroare dashboard", { description: err?.message || "Nu am putut încărca datele." });
    } finally {
      setLoading(false);
    }
  }, [page, status, q]);

  useEffect(() => {
    let mounted = true;
    load().finally(() => { if (!mounted) return; });
    return () => { mounted = false; };
  }, [load]);

  /* ── confirm modal ── */
  const openConfirm  = (cfg) => setConfirm(cfg);
  const closeConfirm = () => { setConfirm(null); setConfirmLoading(false); };

  async function runConfirm() {
    if (!confirm?.action) return;
    try {
      setConfirmLoading(true);
      await confirm.action();
      closeConfirm();
    } catch (err) {
      setConfirmLoading(false);
      toast.error("Acțiunea a eșuat", { description: err?.message || "Încearcă din nou." });
    }
  }

  const cleanPhone = (s) => String(s || "").replace(/[^\d+]/g, "");

  /* ── render ── */
  return (
    <div className="hdPage">
      <main className="hdMain">

        {/* HEADER */}
        <div className="hdHeader">
          <div>
            <div className="hdTitle">Prezentare generală</div>
            <div className="hdSub">Monitorizează performanța proprietăților și administrează anunțurile.</div>
          </div>
          <div className="hdActions">
            <button className="hdChip hdChipAccent" type="button">📅 Ultimele 30 zile</button>
            <button className="hdChip" type="button" onClick={() => exportCSV(listings)}>
              ↓ Export CSV
            </button>
          </div>
        </div>

        <section className="hdGrid">

          {/* KPIs */}
          <div className="hdKpis">
            {kpis.map((k) => (
              <div key={k.label} className="hdCard hdKpiCard">
                <div className="hdCardTop">
                  <div className="hdCardLabel">{k.label}</div>
                  <TrendBadge pct={k.trend} />
                </div>
                <div className="hdCardValue">{k.value}</div>
                <div className="hdCardHint">{k.hint}</div>
                {k.spark
                  ? <MiniSparkline data={k.spark} color={k.sparkColor} />
                  : <div className="hdSparkEmpty" />}
              </div>
            ))}
          </div>

          {/* Line chart */}
          <div className="hdCard hdChart">
            <div className="hdCardTop">
              <div className="hdCardLabel">Activitate — 30 zile</div>
              <div className="hdLegend">
                <span className="hdLegendDot" /> Vizualizări
                <span className="hdLegendDot alt" /> Click-uri
              </div>
            </div>
            <DashLineChart data={daily} />
          </div>

          {/* Listings table */}
          <div className="hdCard hdTable">
            <div className="hdCardTop">
              <div className="hdCardLabel">Anunțurile tale</div>
              <div className="hdToolbar">
                <div className="hdFilters">
                  <select
                    className="hdSelect"
                    value={status}
                    onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                    aria-label="Filtru status"
                  >
                    {Object.keys(STATUS_LABEL).map((k) => (
                      <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                    ))}
                  </select>
                  <select
                    className="hdSelect"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label="Sortare"
                  >
                    <option value="views_desc">Vizualizări ↓</option>
                    <option value="clicks_desc">Click-uri ↓</option>
                    <option value="completion_desc">Completare ↓</option>
                    <option value="name_asc">Nume A→Z</option>
                  </select>
                </div>
                <div className="hdSearch">
                  <input
                    className="hdSearchInput"
                    value={q}
                    onChange={(e) => { setPage(1); setQ(e.target.value); }}
                    placeholder="Caută după titlu / locație…"
                  />
                </div>
              </div>
            </div>

            <div className="hdTableHead">
              <div>Proprietate</div>
              <div>Status</div>
              <div>Completare</div>
              <div>Vizualizări</div>
              <div>Click-uri</div>
              <div />
            </div>

            <div className="hdRows">
              {loading && (
                <div className="hdSkeleton">
                  <div className="skLine" />
                  <div className="skLine" />
                  <div className="skLine" />
                </div>
              )}

              {!loading && listings.map((p) => {
                const tone       = statusTone(p.status);
                const completion = clamp(Number(p.completion) || 0, 0, 100);

                return (
                  <div className="hdRow" key={p.id}>
                    <div className="hdProp">
                      <div
                        className="hdThumb"
                        style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                      />
                      <div className="hdPropText">
                        <div className="hdPropName">{p.name}</div>
                        <div className="hdPropMeta">{p.location}</div>
                      </div>
                    </div>

                    <div className="hdCell" data-label="Status">
                      <span className={`hdBadge tone-${tone}`}>{STATUS_LABEL[p.status] || p.status}</span>
                    </div>

                    <div className="hdCell" data-label="Completare">
                      <div className="hdProgress">
                        <div className="hdProgressBar" style={{ width: `${completion}%` }} />
                      </div>
                      <div className="hdProgressText">{completion}%</div>
                    </div>

                    <div className="hdCell" data-label="Vizualizări">{p.views30}</div>
                    <div className="hdCell" data-label="Click-uri">{p.clicks30}</div>

                    <div className="hdCell hdActionsCell">
                      {p.status === "draft" && (
                        <button
                          className="hdBtn hdBtnAccent"
                          onClick={() =>
                            openConfirm({
                              title: "Trimite anunțul la verificare?",
                              description: "După trimitere, nu vei mai putea modifica anunțul până la finalizarea verificării.",
                              tone: "accent",
                              action: async () => {
                                await hostDashboardService.submitForReview(p.id);
                                toast.success("Trimis la verificare");
                                await load();
                              },
                            })
                          }
                        >
                          Trimite
                        </button>
                      )}

                      {(p.status === "live" || p.status === "paused") && (
                        <button
                          className="hdBtn"
                          onClick={() =>
                            openConfirm({
                              title: p.status === "paused" ? "Reia anunțul?" : "Pauză anunț?",
                              description: p.status === "paused"
                                ? "Anunțul va redeveni vizibil pentru clienți."
                                : "Anunțul nu va mai fi vizibil până îl reiei.",
                              tone: "default",
                              action: async () => {
                                await hostDashboardService.togglePause(p.id);
                                toast.success("Status actualizat");
                                await load();
                              },
                            })
                          }
                        >
                          {p.status === "paused" ? "Reia" : "Pauză"}
                        </button>
                      )}

                      <button className="hdBtn" type="button" onClick={() => navigate(`/host/${p.id}/edit`)}>
                        Editează
                      </button>
                    </div>
                  </div>
                );
              })}

              {!loading && listings.length === 0 && (
                <div className="hdEmpty">Nu există proprietăți pentru filtrul selectat.</div>
              )}

              {!loading && pagesCount > 1 && (
                <div className="hdPager">
                  <button className="hdBtn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    ← Înapoi
                  </button>
                  <div className="hdPagerText">Pagina {page} / {pagesCount}</div>
                  <button className="hdBtn" onClick={() => setPage((p) => Math.min(pagesCount, p + 1))} disabled={page >= pagesCount}>
                    Înainte →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Inbox */}
          <div className="hdCard hdInbox">
            <div className="hdCardTop">
              <div className="hdInboxTools">
                <button className={`hdChip ${inboxFilter === "unread" ? "hdChipAccent" : ""}`} type="button" onClick={() => setInboxFilter("unread")}>
                  Necitite
                </button>
                <button className={`hdChip ${inboxFilter === "all" ? "hdChipAccent" : ""}`} type="button" onClick={() => setInboxFilter("all")}>
                  Toate
                </button>
                <button
                  className="hdChip"
                  type="button"
                  disabled={inboxBusy}
                  onClick={async () => {
                    try {
                      setInboxBusy(true);
                      await markHostMessagesReadAll();
                      setInbox((prev) => (prev || []).map((x) => ({ ...x, status: "read" })));
                    } finally {
                      setInboxBusy(false);
                    }
                  }}
                >
                  Marchează citite
                </button>
                <button className="hdChip" type="button" onClick={load}>↺ Refresh</button>
              </div>
            </div>

            <div className="hdInboxList">
              {inboxSorted.slice(0, 6).map((m) => {
                const id    = m.id || m._id;
                const isNew = (m.status || "new") === "new";
                const name  = m.guestName || m.fromName || m.name || "Client";
                const when  = m.createdAt
                  ? new Date(m.createdAt).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })
                  : "";
                return (
                  <button
                    key={String(id)}
                    type="button"
                    className={`hdMsg2 ${isNew ? "isNew" : ""}`}
                    onClick={() => setActiveMsg(m)}
                  >
                    <div className="hdMsg2Avatar">{name[0]?.toUpperCase() || "C"}</div>
                    <div className="hdMsg2Body">
                      <div className="hdMsg2Top">
                        <div className="hdMsg2Left">
                          <div className="hdMsg2Name">{name}</div>
                          {isNew && <span className="hdUnread2">NECITIT</span>}
                        </div>
                        <div className="hdMsg2Time">{when}</div>
                      </div>
                      <div className="hdMsg2Meta">{m.propertyId?.title || "Proprietate"}</div>
                      <div className="hdMsg2Text">
                        {String(m.message || "").slice(0, 110)}
                        {String(m.message || "").length >= 110 ? "…" : ""}
                      </div>
                    </div>
                  </button>
                );
              })}

              {inboxSorted.length === 0 && !loading && (
                <div className="hdEmpty">Nu ai mesaje.</div>
              )}
            </div>
          </div>

        </section>

        <ConfirmModal
          open={!!confirm}
          title={confirm?.title}
          description={confirm?.description}
          tone={confirm?.tone}
          confirmText="Confirmă"
          cancelText="Renunță"
          loading={confirmLoading}
          onConfirm={runConfirm}
          onClose={closeConfirm}
        />

        <HostInboxModal
          open={!!activeMsg}
          msg={activeMsg}
          onClose={() => setActiveMsg(null)}
          onMarkRead={async () => {
            if (!activeMsg) return;
            const id = activeMsg.id || activeMsg._id;
            await markHostMessageRead(id);
            setInbox((prev) => (prev || []).map((x) =>
              String(x.id || x._id) === String(id) ? { ...x, status: "read" } : x
            ));
            setActiveMsg((p) => (p ? { ...p, status: "read" } : p));
          }}
          onMarkUnread={async () => {
            if (!activeMsg) return;
            const id = activeMsg.id || activeMsg._id;
            await markHostMessageUnread(id);
            setInbox((prev) => (prev || []).map((x) =>
              String(x.id || x._id) === String(id) ? { ...x, status: "new" } : x
            ));
            setActiveMsg((p) => (p ? { ...p, status: "new" } : p));
          }}
        />

      </main>
    </div>
  );
}
