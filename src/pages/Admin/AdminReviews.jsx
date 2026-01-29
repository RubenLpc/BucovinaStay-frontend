import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, EyeOff, Eye, Trash2, Star, ArrowUpDown } from "lucide-react";
import { adminListReviews, adminPatchReview, adminDeleteReview } from "../../api/adminService";
import "./Admin.css";
import { useTranslation } from "react-i18next";

function statusTone(s) {
  if (s === "visible") return "good";
  if (s === "hidden") return "bad";
  return "muted";
}

function stars(n) {
  const k = Math.max(0, Math.min(5, Number(n || 0)));
  return "★★★★★".slice(0, k) + "☆☆☆☆☆".slice(0, 5 - k);
}

export default function AdminReviews() {
  const { t } = useTranslation();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => setPage(1), [q, status, rating, sort]);

  const load = async () => {
    const res = await adminListReviews({ page, limit, q, status, rating, sort });
    setRows(res?.items || []);
    setTotal(res?.total || 0);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        if (!alive) return;
        toast.error(t("admin.reviews.toastLoadFailTitle"), { description: e?.message || t("admin.common.error") });
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
    // eslint-disable-next-line
  }, [page, limit, q, status, rating, sort, t]);

  const toggleVisibility = async (id, currentStatus) => {
    try {
      const next = currentStatus === "visible" ? "hidden" : "visible";
      await adminPatchReview(id, { status: next });
      toast.success(next === "hidden" ? t("admin.reviews.toastHidden") : t("admin.reviews.toastVisible"));
      await load();
    } catch (e) {
      toast.error(t("admin.reviews.toastUpdateFailTitle"), { description: e?.message || t("admin.common.error") });
    }
  };

  const del = async (id) => {
    try {
      const ok = window.confirm(t("admin.reviews.confirmDelete"));
      if (!ok) return;
      await adminDeleteReview(id);
      toast.success(t("admin.common.deleted"));
      await load();
    } catch (e) {
      toast.error(t("admin.reviews.toastDeleteFailTitle"), { description: e?.message || t("admin.common.error") });
    }
  };

  return (
    <div className="hdCard hdTable adReviews">
      <div className="hdCardTop">
        <div>
          <div className="hdCardLabel">{t("admin.reviews.cardTitle")} </div>
          <div className="hdCardHint">{t("admin.common.resultsCount", { count: total, total })}</div>
        </div>

        <div className="hdToolbar">
          <div className="hdFilters">
            <select className="hdSelect" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">{t("admin.common.status.all")}</option>
              <option value="visible">{t("admin.reviews.status.visible")}</option>
              <option value="hidden">{t("admin.reviews.status.hidden")}</option>
            </select>

            <select className="hdSelect" value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="all">{t("admin.reviews.filters.ratingAny")}</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>

            <button
              className="hdBtn"
              type="button"
              onClick={() => setSort((s) => (s === "newest" ? "rating_desc" : "newest"))}
              title={t("admin.reviews.filters.sort")}
            >
              <ArrowUpDown size={16} /> {t("admin.reviews.filters.sort")}
            </button>
          </div>

          <div className="hdSearch">
            <div className="adSearchWrap">
              <Search size={16} />
              <input
                className="hdSearchInput adSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("admin.reviews.searchPlaceholder")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="adReviewsHead">
        <div>{t("admin.reviews.cols.review")}</div>
        <div>{t("admin.reviews.cols.rating")}</div>
        <div>{t("admin.reviews.cols.status")}</div>
        <div style={{ justifySelf: "end" }}>{t("admin.common.actions")}</div>
      </div>

      {loading ? (
        <div className="hdSkeleton">
          <div className="skLine" />
          <div className="skLine" />
          <div className="skLine" />
        </div>
      ) : rows.length === 0 ? (
        <div className="hdEmpty">{t("admin.common.empty")}</div>
      ) : (
        <div className="adRows">
          {rows.map((r) => {
            const user = r.userId || {};
            const prop = r.propertyId || {};

            const userName = user.name || t("admin.common.fallbackUser");
            const userEmail = user.email || "";
            const propTitle = prop.title || t("admin.common.fallbackProperty");
            const propMeta = [prop.city, prop.locality, prop.type].filter(Boolean).join(" • ");

            const isHidden = r.status === "hidden";

            return (
              <div className="adRow adReviewRow" key={r._id}>
                {/* Mobile kebab */}
                <div className="adReviewMobileHead">
                  <details className="adKebab">
                    <summary className="hdBtn adKebabBtn" aria-label={t("admin.common.actions")}>
                      ⋯
                    </summary>

                    <div className="adMenu">
                      <button className="adMenuItem" type="button" onClick={() => toggleVisibility(r._id, r.status)}>
                        {isHidden ? t("admin.reviews.actions.unhide") : t("admin.reviews.actions.hide")}
                      </button>

                      <div className="adMenuSep" />

                      <button className="adMenuItem" type="button" onClick={() => del(r._id)}>
                        {t("admin.reviews.actions.delete")}
                      </button>
                    </div>
                  </details>
                </div>

                <div className="adReviewMobileBadges">
                  <span className={`hdBadge tone-${statusTone(r.status)}`}>{t(`admin.reviews.status.${r.status}`)}</span>
                  <span className="hdBadge">
                    <Star size={14} /> {r.rating} • {stars(r.rating)}
                  </span>
                </div>

                <div className="adReviewCell">
                  <div className="adReviewTop">
                    <div className="adReviewTitle" title={propTitle}>
                      {propTitle}
                    </div>
                  </div>

                  <div className="adReviewUserLine" title={userEmail}>
                    {userName}
                  </div>

                  <div className="adReviewMeta">
                    {propMeta}
                    {userEmail ? ` • ${userEmail}` : ""}
                  </div>

                  <div className={`adReviewComment ${isHidden ? "isHidden" : ""}`} title={r.comment}>
                    {r.comment}
                  </div>
                </div>

                <div className="hdCell">
                  <span className="adStars">
                    <Star size={14} /> {r.rating} • {stars(r.rating)}
                  </span>
                </div>

                <div className="hdCell">
                  <span className={`hdBadge tone-${statusTone(r.status)}`}>{t(`admin.reviews.status.${r.status}`)}</span>
                </div>

                <div className="hdActionsCell">
                  <button
                    className={`hdBtn ${isHidden ? "hdBtnAccent" : ""}`}
                    type="button"
                    onClick={() => toggleVisibility(r._id, r.status)}
                    title={isHidden ? t("admin.reviews.tips.makeVisible") : t("admin.reviews.tips.makeHidden")}
                  >
                    {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    {isHidden ? t("admin.reviews.actions.unhide") : t("admin.reviews.actions.hide")}
                  </button>

                  <button className="hdBtn" type="button" onClick={() => del(r._id)} title={t("admin.reviews.tips.delete")}>
                    <Trash2 size={16} /> {t("admin.reviews.actions.delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && total > 0 ? (
        <div className="hdPager">
          <button className="hdBtn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t("admin.common.back")}
          </button>
          <div className="hdPagerText">{t("admin.common.pageOf", { page, totalPages })}</div>
          <button className="hdBtn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            {t("admin.common.next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
