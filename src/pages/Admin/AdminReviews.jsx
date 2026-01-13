import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, EyeOff, Eye, Trash2, Star, ArrowUpDown } from "lucide-react";
import { adminListReviews, adminPatchReview, adminDeleteReview } from "../../api/adminService";
import "./Admin.css";


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
        toast.error("Nu am putut încărca review-urile", { description: e?.message || "Eroare" });
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
    // eslint-disable-next-line
  }, [page, limit, q, status, rating, sort]);

  const toggleVisibility = async (id, currentStatus) => {
    try {
      const next = currentStatus === "visible" ? "hidden" : "visible";
      await adminPatchReview(id, { status: next });
      toast.success(next === "hidden" ? "Review ascuns" : "Review vizibil");
      await load();
    } catch (e) {
      toast.error("Nu am putut actualiza", { description: e?.message || "Eroare" });
    }
  };

  const del = async (id) => {
    try {
      const ok = window.confirm("Ștergi definitiv review-ul? (irreversibil)");
      if (!ok) return;
      await adminDeleteReview(id);
      toast.success("Șters");
      await load();
    } catch (e) {
      toast.error("Nu am putut șterge", { description: e?.message || "Eroare" });
    }
  };

  return (
    <div className="hdCard hdTable adReviews">
      <div className="hdCardTop">
        <div>
          <div className="hdCardLabel">Reviews moderation</div>
          <div className="hdCardHint">{total} rezultate</div>
        </div>

        <div className="hdToolbar">
          <div className="hdFilters">
            <select className="hdSelect" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">all</option>
              <option value="visible">visible</option>
              <option value="hidden">hidden</option>
            </select>

            <select className="hdSelect" value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="all">rating</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>

            <button className="hdBtn" type="button" onClick={() => setSort((s) => (s === "newest" ? "rating_desc" : "newest"))}>
              <ArrowUpDown size={16} /> Sort
            </button>
          </div>

          <div className="hdSearch">
            <div className="adSearchWrap">
              <Search size={16} />
              <input
                className="hdSearchInput adSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Caută: user / email / property / comment..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="adReviewsHead">
        <div>Review</div>
        <div>Rating</div>
        <div>Status</div>
        <div style={{ justifySelf: "end" }}>Acțiuni</div>
      </div>

      {loading ? (
        <div className="hdSkeleton">
          <div className="skLine" />
          <div className="skLine" />
          <div className="skLine" />
        </div>
      ) : rows.length === 0 ? (
        <div className="hdEmpty">Nimic de afișat.</div>
      ) : (
        <div className="adRows">
          {rows.map((r) => {
            const user = r.userId || {};
            const prop = r.propertyId || {};

            const userName = user.name || "User";
            const userEmail = user.email || "";
            const propTitle = prop.title || "Property";
            const propMeta = [prop.city, prop.locality, prop.type].filter(Boolean).join(" • ");

            const isHidden = r.status === "hidden";

            return (
              <div className="adRow adReviewRow" key={r._id}>
                <div className="adReviewMobileHead">
  <details className="adKebab">
    <summary className="hdBtn adKebabBtn" aria-label="Actions">⋯</summary>

    <div className="adMenu">
      <button
        className="adMenuItem"
        type="button"
        onClick={() => toggleVisibility(r._id, r.status)}
      >
        {isHidden ? "Unhide review" : "Hide review"}
      </button>

      <div className="adMenuSep" />

      <button className="adMenuItem" type="button" onClick={() => del(r._id)}>
        Delete review
      </button>
    </div>
  </details>
</div>

<div className="adReviewMobileBadges">
  <span className={`hdBadge tone-${statusTone(r.status)}`}>{r.status}</span>
  <span className="hdBadge">
    <Star size={14} /> {r.rating} • {stars(r.rating)}
  </span>
</div>

                <div className="adReviewCell">
                <div className="adReviewTop">
  <div className="adReviewTitle" title={propTitle}>{propTitle}</div>
</div>

<div className="adReviewUserLine" title={userEmail}>
  {userName}
</div>

                  <div className="adReviewMeta">{propMeta}{userEmail ? ` • ${userEmail}` : ""}</div>

                  <div className={`adReviewComment ${isHidden ? "isHidden" : ""}`} title={r.comment}>
                    {r.comment}
                  </div>
                </div>

                <div className="hdCell">
                  <span className="adStars"><Star size={14} /> {r.rating} • {stars(r.rating)}</span>
                </div>

                <div className="hdCell">
                  <span className={`hdBadge tone-${statusTone(r.status)}`}>{r.status}</span>
                </div>

                <div className="hdActionsCell">
                  <button
                    className={`hdBtn ${isHidden ? "hdBtnAccent" : ""}`}
                    type="button"
                    onClick={() => toggleVisibility(r._id, r.status)}
                    title={isHidden ? "Fă review-ul vizibil" : "Ascunde review-ul"}
                  >
                    {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    {isHidden ? "Unhide" : "Hide"}
                  </button>

                  <button className="hdBtn" type="button" onClick={() => del(r._id)} title="Șterge definitiv">
                    <Trash2 size={16} /> Delete
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
            Înapoi
          </button>
          <div className="hdPagerText">
            Pagina <b>{page}</b> din <b>{totalPages}</b>
          </div>
          <button className="hdBtn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Înainte
          </button>
        </div>
      ) : null}
    </div>
  );
}
