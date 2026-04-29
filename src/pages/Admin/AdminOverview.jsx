import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Users, ShieldCheck, Home, Clock3, Star } from "lucide-react";
import { adminGetOverview } from "../../api/adminService";
import AdminPage from "./AdminPage";
import "./Admin.css";
import { useTranslation } from "react-i18next";

function pct(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

function safeDiv(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) return 0;
  return x / y;
}

const CVW = 800;
const CVH = 200;
const CPAD = { t: 10, r: 14, b: 34, l: 42 };
const CIW = CVW - CPAD.l - CPAD.r;
const CIH = CVH - CPAD.t - CPAD.b;

function AdminLineChart({ data, locale, t }) {
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

    return { toX, toY, gridLines, imprPts, clicksPts, areaPoints };
  }, [data]);

  const handleMouseMove = useCallback(
    (e) => {
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
    },
    [computed, data]
  );

  const formatShortDay = useCallback(
    (day) => {
      if (!day) return "";
      return new Date(day).toLocaleDateString(locale, { month: "2-digit", day: "2-digit" });
    },
    [locale]
  );

  const formatLongDay = useCallback(
    (day) => {
      if (!day) return "";
      return new Date(day).toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    },
    [locale]
  );

  if (!data?.length || !computed) {
    return <div className="hdChartEmpty">{t("admin.overview.hintLine")}</div>;
  }

  const { toX, toY, gridLines, imprPts, clicksPts, areaPoints } = computed;
  const hovIdx = hovered ? data.indexOf(hovered) : -1;
  const xPct = hovIdx >= 0 ? (toX(hovIdx) / CVW) * 100 : 0;
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
          <linearGradient id="ad-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ad-chart-area-top)" />
            <stop offset="100%" stopColor="var(--ad-chart-area-bottom)" />
          </linearGradient>
        </defs>

        {gridLines.map(({ y, label }) => (
          <g key={label}>
            <line
              x1={CPAD.l}
              y1={y}
              x2={CVW - CPAD.r}
              y2={y}
              stroke="var(--ad-chart-grid)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={CPAD.l - 6}
              y={y}
              dominantBaseline="middle"
              textAnchor="end"
              fontSize="10"
              fill="var(--ad-chart-axis)"
              fontWeight="700"
            >
              {label}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="url(#ad-area-grad)" />

        {data.map((d, i) => (
          <text
            key={d.day || i}
            x={toX(i)}
            y={CVH - CPAD.b + 16}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ad-chart-axis-2)"
            fontWeight="700"
          >
            {formatShortDay(d.day)}
          </text>
        ))}

        {hovIdx >= 0 && (
          <line
            x1={toX(hovIdx)}
            y1={CPAD.t}
            x2={toX(hovIdx)}
            y2={CPAD.t + CIH}
            stroke="var(--ad-chart-hover)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        <polyline
          points={imprPts}
          fill="none"
          stroke="var(--ad-chart-line)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <polyline
          points={clicksPts}
          fill="none"
          stroke="var(--ad-chart-line-2)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hovIdx >= 0 && (
          <>
            <circle
              cx={toX(hovIdx)}
              cy={toY(hovered.impressions || 0)}
              r="4.5"
              fill="var(--ad-chart-dot)"
              stroke="var(--ad-chart-dot-stroke)"
              strokeWidth="1.5"
            />
            <circle
              cx={toX(hovIdx)}
              cy={toY(hovered.clicks || 0)}
              r="4.5"
              fill="var(--ad-chart-line-2)"
              stroke="var(--ad-chart-dot-stroke)"
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>

      {hovered && hovIdx >= 0 && (
        <div
          className="hdChartTooltip"
          style={{ left: `${xPct}%` }}
        >
          <div className="hdTtDate">{formatLongDay(hovered.day)}</div>
          <div className="hdTtRow">
            <span className="hdTtDot" style={{ background: "var(--ad-chart-dot)" }} />
            {t("admin.overview.chart.impr")} <strong>{hovered.impressions || 0}</strong>
          </div>
          <div className="hdTtRow">
            <span className="hdTtDot accent" />
            {t("admin.overview.chart.clk")} <strong>{hovered.clicks || 0}</strong>
          </div>
          {(hovered.impressions || 0) > 0 && (
            <div className="hdTtRow muted">
              CTR <strong>{ctr.toFixed(1)}%</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminOverview() {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await adminGetOverview();
        if (!alive) return;
        setKpis(res?.kpis || null);
        setSeries(res?.series7d || []);
      } catch (e) {
        if (!alive) return;
        toast.error(t("admin.overview.toastLoadFailTitle"), {
          description: e?.message || t("admin.common.error"),
        });
        setKpis(null);
        setSeries([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [t]);

  const ctr = useMemo(() => pct(kpis?.ctr7d), [kpis]);

  const locale = (i18n.resolvedLanguage || i18n.language || "ro").startsWith("ro") ? "ro-RO" : "en-US";
  const chartSeries = useMemo(
    () => (series.length ? series : Array.from({ length: 7 }).map(() => ({ impressions: 0, clicks: 0 }))),
    [series]
  );

  return (
    <AdminPage
      titleKey="admin.overview.pageTitle"
      subtitleKey="admin.overview.pageSubtitle"
    >
      <div className="hdGrid">
        <div className="hdKpis">
          <div className="hdCard adStatCard adStatCardUsers">
            <div className="hdCardTop adStatTop">
              <div className="hdCardLabel adStatLabel">{t("admin.overview.kpis.users")}</div>
              <div className="hdCardMini adStatMini">
                <Users size={18} />
              </div>
            </div>
            <div className="hdCardValue adStatValue">{loading ? "—" : (kpis?.users ?? 0)}</div>
            <div className="hdCardHint adStatHint">
              {t("admin.overview.kpis.disabled")}: {loading ? "—" : (kpis?.disabledUsers ?? 0)}
            </div>
            <div className="adStatGlow" />
          </div>

          <div className="hdCard adStatCard adStatCardRoles">
            <div className="hdCardTop adStatTop">
              <div className="hdCardLabel adStatLabel">{t("admin.overview.kpis.hostsAdmins")}</div>
              <div className="hdCardMini adStatMini">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="hdCardValue adStatValue">
              {loading ? "—" : `${kpis?.hosts ?? 0} / ${kpis?.admins ?? 0}`}
            </div>
            <div className="hdCardHint adStatHint">{t("admin.overview.kpis.activeRoles")}</div>
            <div className="adStatGlow" />
          </div>

          <div className="hdCard adStatCard adStatCardListings">
            <div className="hdCardTop adStatTop">
              <div className="hdCardLabel adStatLabel">{t("admin.overview.kpis.listings")}</div>
              <div className="hdCardMini adStatMini">
                <Home size={18} />
              </div>
            </div>
            <div className="hdCardValue adStatValue">{loading ? "—" : (kpis?.properties ?? 0)}</div>
            <div className="hdCardHint adStatHint">
              {t("admin.overview.kpis.live")} {kpis?.liveProperties ?? 0} •{" "}
              {t("admin.overview.kpis.pending")} {kpis?.pendingProperties ?? 0}
            </div>
            <div className="adStatGlow" />
          </div>

          <div className="hdCard adStatCard adStatCardAnalytics">
            <div className="hdCardTop adStatTop">
              <div className="hdCardLabel adStatLabel">{t("admin.overview.kpis.analytics7d")}</div>
              <div className="hdCardMini adStatMini">
                <Clock3 size={18} />
              </div>
            </div>
            <div className="hdCardValue adStatValue">{loading ? "—" : (kpis?.impressions7d ?? 0)}</div>
            <div className="hdCardHint adStatHint">
              {t("admin.overview.kpis.clicks")} {kpis?.clicks7d ?? 0} •{" "}
              {t("admin.overview.kpis.ctr")} {ctr.toFixed(1)}%
            </div>
            <div className="adStatGlow" />
          </div>
        </div>

        {/* chart */}
        <div className="hdCard hdChart">
          <div className="hdCardTop">
            <div>
              <div className="hdCardLabel">{t("admin.overview.chart.title")}</div>
              <div className="hdCardHint">{t("admin.overview.chart.subtitle")}</div>
            </div>
            <div className="hdLegend">
              <span className="hdLegendDot" /> {t("admin.overview.chart.impressions")}
              <span className="hdLegendDot alt" /> {t("admin.overview.chart.clicks")}
            </div>
          </div>

          <div className="hdChartArea">
            <AdminLineChart data={chartSeries} locale={locale} t={t} />
          </div>

          <div className="adHintLine">{t("admin.overview.hintLine")}</div>
        </div>
      </div>
    </AdminPage>
  );
}
