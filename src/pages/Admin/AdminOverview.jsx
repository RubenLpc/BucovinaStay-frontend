import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, ShieldCheck, Home, Clock3 } from "lucide-react";
import { adminGetOverview } from "../../api/adminService";
import AdminPage from "./AdminPage";
import "./Admin.css";

function pct(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

export default function AdminOverview() {
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
        toast.error("Nu am putut încărca overview", { description: e?.message || "Eroare" });
        setKpis(null);
        setSeries([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const ctr = useMemo(() => pct(kpis?.ctr7d), [kpis]);

  const maxImpr = useMemo(() => Math.max(1, ...series.map((d) => Number(d.impressions || 0))), [series]);
  const maxClk = useMemo(() => Math.max(1, ...series.map((d) => Number(d.clicks || 0))), [series]);

  return (
    <AdminPage title="Admin Panel" subtitle="Overview + moderare">
      <div className="hdGrid">
        <div className="hdKpis">
          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">Users</div>
              <div className="hdCardMini"><Users size={18} /></div>
            </div>
            <div className="hdCardValue">{loading ? "—" : (kpis?.users ?? 0)}</div>
            <div className="hdCardHint">disabled: {loading ? "—" : (kpis?.disabledUsers ?? 0)}</div>
            <div className="hdSpark" />
          </div>

          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">Hosts / Admins</div>
              <div className="hdCardMini"><ShieldCheck size={18} /></div>
            </div>
            <div className="hdCardValue">{loading ? "—" : `${kpis?.hosts ?? 0} / ${kpis?.admins ?? 0}`}</div>
            <div className="hdCardHint">roluri active</div>
            <div className="hdSpark" />
          </div>

          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">Listings</div>
              <div className="hdCardMini"><Home size={18} /></div>
            </div>
            <div className="hdCardValue">{loading ? "—" : (kpis?.properties ?? 0)}</div>
            <div className="hdCardHint">
              live {kpis?.liveProperties ?? 0} • pending {kpis?.pendingProperties ?? 0}
            </div>
            <div className="hdSpark" />
          </div>

          <div className="hdCard">
            <div className="hdCardTop">
              <div className="hdCardLabel">Analytics (7 zile)</div>
              <div className="hdCardMini"><Clock3 size={18} /></div>
            </div>
            <div className="hdCardValue">{loading ? "—" : (kpis?.impressions7d ?? 0)}</div>
            <div className="hdCardHint">clicks {kpis?.clicks7d ?? 0} • CTR {ctr.toFixed(1)}%</div>
            <div className="hdSpark" />
          </div>
        </div>

        {/* chart */}
        <div className="hdCard hdChart">
          <div className="hdCardTop">
            <div>
              <div className="hdCardLabel">Trend 7 zile</div>
              <div className="hdCardHint">impressions vs clicks</div>
            </div>
            <div className="hdLegend">
              <span className="hdLegendDot" /> Impressions
              <span className="hdLegendDot alt" /> Clicks
            </div>
          </div>

          <div className="hdChartArea">
            <div className="hdBars">
              {(series.length ? series : Array.from({ length: 7 }).map(() => ({ impressions: 0, clicks: 0 }))).map((d, idx) => {
                const h1 = Math.round((Number(d.impressions || 0) / maxImpr) * 100);
                const h2 = Math.round((Number(d.clicks || 0) / maxClk) * 100);
                return (
                  <div className="hdBarCol" key={idx} title={`${d.day || ""} • impr ${d.impressions || 0} • clk ${d.clicks || 0}`}>
                    <div className="hdBar" style={{ height: `${h1}%` }} />
                    <div className="hdBar alt" style={{ height: `${h2}%` }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="adHintLine">
            Tip: dacă CTR e mic, verifică covers + titles + badge-uri.
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
