import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getPropertyReviews,
  createPropertyReview,
  getMyPropertyReview,
  deletePropertyReview,
} from "../../api/reviewService";
import "./PropertyReviews.css";
import { useAuthStore } from "../../stores/authStore";
import { Star, ShieldCheck, ArrowUpDown } from "lucide-react";




function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "U";
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function Stars({ value = 0, size = 14 }) {
  const v = clamp(Number(value) || 0, 0, 5);
  const full = Math.round(v);
  return (
    <span className="prStarsInline" aria-label={`${v} din 5`}>
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

function SkeletonItem() {
  return (
    <div className="prItem prItemSkeleton">
      <div className="prAvatar prAvatarSkeleton" />
      <div className="prBody">
        <div className="prSkLine prSkLineShort" />
        <div className="prSkLine" />
        <div className="prSkLine prSkLineMed" />
      </div>
    </div>
  );
}

export default function PropertyReviews({ propertyId }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [myReview, setMyReview] = useState(null);

  // paging
  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // sort
  // backend currently sorts by newest. We'll do client-side sort for now.
  const [sort, setSort] = useState("newest"); // newest | ratingDesc

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    const s = reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
    return Math.round(s * 10) / 10;
  }, [reviews]);


  const handleDelete = async (reviewId) => {
    try {
      await deletePropertyReview(propertyId, reviewId);
      toast.success("Recenzie ștearsă");
  
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setMyReview(null);
  
      // opțional: recalcul corect pentru avg în UI (doar pentru secțiune)
      // load(1);
    } catch (e) {
      toast.error("Nu am putut șterge", {
        description: e?.message || "Încearcă din nou.",
      });
    }
  };
  

  const sortedReviews = useMemo(() => {
    const arr = [...reviews];
    if (sort === "ratingDesc") {
      arr.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (new Date(b.createdAt) - new Date(a.createdAt)));
      return arr;
    }
    // newest default
    arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return arr;
  }, [reviews, sort]);

  const load = async (pageToLoad = 1) => {
    try {
      if (pageToLoad === 1) setLoading(true);
      const data = await getPropertyReviews(propertyId, {
        page: pageToLoad,
        limit: PAGE_SIZE,
      });

      const items = data.items || [];

      setReviews((prev) => (pageToLoad === 1 ? items : [...prev, ...items]));
      setHasMore(items.length === PAGE_SIZE);
      setPage(pageToLoad);
    } catch (e) {
      toast.error("Eroare", { description: e?.message || "Nu am putut încărca recenziile." });
    } finally {
      if (pageToLoad === 1) setLoading(false);
    }
  };

  useEffect(() => {
    if (!propertyId) return;
    load(1);
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId || !user) return;
    (async () => {
      try {
        const r = await getMyPropertyReview(propertyId);
        setMyReview(r);
      } catch {
        // ignore
      }
    })();
  }, [propertyId, user]);

  const userCanReview = !!user && !myReview;

  const handleAddReview = async () => {
    if (!user) return navigate("/auth/login");
    if (!comment.trim()) return;

    try {
      setSubmitting(true);
      const created = await createPropertyReview(propertyId, {
        rating,
        comment: comment.trim(),
      });

      toast.success("Recenzie trimisă", { description: "Mulțumim! Recenzia ta a fost publicată." });

      // add to top (newest)
      setReviews((prev) => [
        {
          id: created.id,
          rating: created.rating,
          comment: created.comment,
          createdAt: created.createdAt,
          userName: created.userName || user?.name || "Tu",
          userId: String(user?._id || ""), // ✅ IMPORTANT pentru butonul Șterge
        },
        ...prev,
      ]);
      

      setMyReview(created);
      setComment("");
      setRating(5);
    } catch (e) {
      toast.error("Nu am putut trimite", { description: e?.message || "Încearcă din nou." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="prWrap">
      {/* Header */}
      <div className="prHeader">
        <div className="prHeaderLeft">
          <h2 className="prTitle">Recenzii</h2>

          {sortedReviews.length ? (
            <div className="prSummary">
              <span className="prSummaryScore">
                <Star size={14} />
                <b>{avg.toFixed(1).replace(".", ",")}</b>
              </span>
              <span className="prSummaryDot">•</span>
              <span className="prSummaryCount">{sortedReviews.length} recenzii</span>
            </div>
          ) : (
            <div className="prSummary prMuted">Fii primul care lasă o recenzie.</div>
          )}
        </div>

        <div className="prHeaderRight">
          <div className="prSort">
            <ArrowUpDown size={14} />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Cele mai recente</option>
              <option value="ratingDesc">Rating (desc)</option>
            </select>
          </div>
        </div>
      </div>

      {/* CTA - neautentificat */}
      {!user ? (
        <div className="prNotice">
          <div className="prNoticeTop">
            <ShieldCheck size={16} />
            <div>
              <div className="prNoticeTitle">Autentifică-te pentru a lăsa o recenzie</div>
              <div className="prNoticeDesc">Recenziile ajută alți oaspeți să aleagă mai bine.</div>
            </div>
          </div>

          <button className="prBtnPrimary" onClick={() => navigate("/auth/login")}>
            Autentificare
          </button>
        </div>
      ) : null}

      {/* User already reviewed */}
      {user && !userCanReview ? (
        <div className="prNotice prNoticeSlim">
          Ai lăsat deja o recenzie pentru această proprietate.
        </div>
      ) : null}

      {/* Form */}
      {user && userCanReview ? (
        <div className="prForm">
          <div className="prFormHeader">
            <div>
              <div className="prFormTitle">Lasă o recenzie</div>
              <div className="prFormSub">Spune pe scurt cum a fost experiența ta.</div>
            </div>

            <div className="prRatingPill">
              <span>Rating:</span>
              <b>{rating}/5</b>
            </div>
          </div>

          <div className="prStarsPicker">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className={`prStarBtn ${s <= rating ? "isOn" : ""}`}
                aria-label={`${s} stele`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Scrie părerea ta despre această cazare..."
            rows={4}
          />

          <div className="prFormFooter">
            <div className="prTiny">
              Recomandare: menționează curățenia, check-in-ul, liniștea, dotările.
            </div>

            <button
              className="prBtnPrimary"
              onClick={handleAddReview}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? "Se trimite..." : "Trimite recenzia"}
            </button>
          </div>
        </div>
      ) : null}

      {/* List */}
      <div className="prList">
        {loading ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : sortedReviews.length === 0 ? (
          <div className="prEmpty">
            <div className="prEmptyTitle">Nu există încă recenzii</div>
            <div className="prEmptyDesc">Cazarea e nouă sau nu a primit încă feedback.</div>
          </div>
        ) : (
          sortedReviews.map((r) => (
            <div key={r.id} className="prItem">
              <div className="prAvatar" title={r.userName}>
                {initials(r.userName)}
              </div>

              <div className="prBody">
                <div className="prTopRow">
  <span className="prName">{r.userName}</span>
  <Stars value={r.rating} />
  <span className="prDate">{new Date(r.createdAt).toLocaleDateString("ro-RO")}</span>

  {user && r.userId && String(r.userId) === String(user._id) ? (
    <button className="prBtnTiny" onClick={() => handleDelete(r.id)}>
      Șterge
    </button>
  ) : null}
</div>


                <p className="prComment">{r.comment}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {!loading && hasMore ? (
        <div className="prLoadMoreWrap">
          <button className="prBtnGhost" onClick={() => load(page + 1)}>
            Vezi mai multe recenzii
          </button>
        </div>
      ) : null}

      {/* Paging loading hint */}
      {!loading && !hasMore && sortedReviews.length > 0 ? (
        <div className="prEndHint">Ai ajuns la final.</div>
      ) : null}
    </section>
  );
}
