import React, { useEffect, useMemo, useState } from "react";
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

  const maxImpr = useMemo(
    () => Math.max(1, ...series.map((d) => Number(d.impressions || 0))),
    [series]
  );
  const maxClk = useMemo(
    () => Math.max(1, ...series.map((d) => Number(d.clicks || 0))),
    [series]
  );

  const locale = (i18n.resolvedLanguage || i18n.language || "ro").startsWith("ro") ? "ro-RO" : "en-US";

  return (
    <AdminPage
      titleKey="admin.overview.pageTitle"
      subtitleKey="admin.overview.pageSubtitle"
    >
      <div className="hdGrid">
        <div className="hdKpis">
          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">{t("admin.overview.kpis.users")}</div>
              <div className="hdCardMini">
                <Users size={18} />
              </div>
            </div>
            <div className="hdCardValue">{loading ? "—" : (kpis?.users ?? 0)}</div>
            <div className="hdCardHint">
              {t("admin.overview.kpis.disabled")}: {loading ? "—" : (kpis?.disabledUsers ?? 0)}
            </div>
            <div className="hdSpark" />
          </div>

          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">{t("admin.overview.kpis.hostsAdmins")}</div>
              <div className="hdCardMini">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="hdCardValue">
              {loading ? "—" : `${kpis?.hosts ?? 0} / ${kpis?.admins ?? 0}`}
            </div>
            <div className="hdCardHint">{t("admin.overview.kpis.activeRoles")}</div>
            <div className="hdSpark" />
          </div>

          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">{t("admin.overview.kpis.listings")}</div>
              <div className="hdCardMini">
                <Home size={18} />
              </div>
            </div>
            <div className="hdCardValue">{loading ? "—" : (kpis?.properties ?? 0)}</div>
            <div className="hdCardHint">
              {t("admin.overview.kpis.live")} {kpis?.liveProperties ?? 0} •{" "}
              {t("admin.overview.kpis.pending")} {kpis?.pendingProperties ?? 0}
            </div>
            <div className="hdSpark" />
          </div>

          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">{t("admin.overview.kpis.analytics7d")}</div>
              <div className="hdCardMini">
                <Clock3 size={18} />
              </div>
            </div>
            <div className="hdCardValue">{loading ? "—" : (kpis?.impressions7d ?? 0)}</div>
            <div className="hdCardHint">
              {t("admin.overview.kpis.clicks")} {kpis?.clicks7d ?? 0} •{" "}
              {t("admin.overview.kpis.ctr")} {ctr.toFixed(1)}%
            </div>
            <div className="hdSpark" />
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
            <div className="hdBars">
              {(series.length ? series : Array.from({ length: 7 }).map(() => ({ impressions: 0, clicks: 0 }))).map(
                (d, idx) => {
                  const h1 = Math.round((Number(d.impressions || 0) / maxImpr) * 100);
                  const h2 = Math.round((Number(d.clicks || 0) / maxClk) * 100);

                  const dayLabel = d.day
                    ? new Date(d.day).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })
                    : "";

                  return (
                    <div
                      className="hdBarCol"
                      key={idx}
                      title={`${dayLabel} • ${t("admin.overview.chart.impr")} ${d.impressions || 0} • ${t(
                        "admin.overview.chart.clk"
                      )} ${d.clicks || 0}`}
                    >
                      <div className="hdBar" style={{ height: `${h1}%` }} />
                      <div className="hdBar alt" style={{ height: `${h2}%` }} />
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="adHintLine">{t("admin.overview.hintLine")}</div>
        </div>
      </div>
    </AdminPage>
  );
}
