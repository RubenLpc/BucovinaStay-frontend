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
import { Star, ShieldCheck, ArrowUpDown, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

function initials(name = "", fallback = "U") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("") || fallback;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function Stars({ value = 0, t }) {
  const v = clamp(Number(value) || 0, 0, 5);
  const full = Math.floor(v)
  return (
    <span className="prStarsInline" aria-label={t("reviews.starsAria", { value: v })}>
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
  const { t, i18n } = useTranslation();
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
  const [sort, setSort] = useState("newest"); // newest | ratingDesc

  const locale = useMemo(() => {
    // map simplu; dacă ai i18n setat "ro"/"en", merge.
    return i18n.language?.startsWith("ro") ? "ro-RO" : "en-US";
  }, [i18n.language]);

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    const s = reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
    return Math.floor(s * 10) / 10;
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    const arr = [...reviews];
    if (sort === "ratingDesc") {
      arr.sort(
        (a, b) =>
          (b.rating || 0) - (a.rating || 0) ||
          (new Date(b.createdAt) - new Date(a.createdAt))
      );
      return arr;
    }
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
      toast.error(t("reviews.toasts.loadErrorTitle"), {
        description: e?.message || t("reviews.toasts.loadErrorDesc"),
      });
    } finally {
      if (pageToLoad === 1) setLoading(false);
    }
  };

  useEffect(() => {
    if (!propertyId) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!user) {
      toast.info(t("reviews.toasts.loginTitle"), {
        description: t("reviews.toasts.loginDesc"),
      });
      return navigate("/auth/login");
    }

    if (!comment.trim()) {
      toast.error(t("reviews.toasts.commentTitle"), {
        description: t("reviews.toasts.commentDesc"),
      });
      return;
    }

    try {
      setSubmitting(true);

      const created = await createPropertyReview(propertyId, {
        rating,
        comment: comment.trim(),
      });

      toast.success(t("reviews.toasts.sentTitle"), {
        description: t("reviews.toasts.sentDesc"),
      });

      // Add to top (newest)
      setReviews((prev) => [
        {
          id: created.id,
          rating: created.rating,
          comment: created.comment,
          createdAt: created.createdAt,
          userName: created.userName || user?.name || t("reviews.you"),
          userId: String(user?._id || ""),
        },
        ...prev,
      ]);

      setMyReview(created);
      setComment("");
      setRating(5);
    } catch (e) {
      toast.error(t("reviews.toasts.sendErrorTitle"), {
        description: e?.message || t("reviews.toasts.sendErrorDesc"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    const ok = window.confirm(t("reviews.confirmDelete"));
    if (!ok) return;

    try {
      await deletePropertyReview(propertyId, reviewId);
      toast.success(t("reviews.toasts.deletedTitle"));

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setMyReview(null);
    } catch (e) {
      toast.error(t("reviews.toasts.deleteErrorTitle"), {
        description: e?.message || t("reviews.toasts.deleteErrorDesc"),
      });
    }
  };

  return (
    <section className="prWrap" aria-label={t("reviews.aria.section")}>
      {/* Header */}
      <div className="prHeader">
        <div className="prHeaderLeft">
          <h2 className="prTitle">{t("reviews.title")}</h2>

          {sortedReviews.length ? (
            <div className="prSummary">
              <span className="prSummaryScore">
                <Star size={14} />
                <b>{avg.toFixed(1).replace(".", ",")}</b>
              </span>
              <span className="prSummaryDot">•</span>
              <span className="prSummaryCount">
                {t("reviews.count", { count: sortedReviews.length })}
              </span>
            </div>
          ) : (
            <div className="prSummary prMuted">{t("reviews.firstHint")}</div>
          )}
        </div>

        <div className="prHeaderRight">
          <div className="prSort">
            <ArrowUpDown size={14} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label={t("reviews.sort.aria")}
            >
              <option value="newest">{t("reviews.sort.newest")}</option>
              <option value="ratingDesc">{t("reviews.sort.ratingDesc")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* CTA - not logged */}
      {!user ? (
        <div className="prNotice">
          <div className="prNoticeTop">
            <ShieldCheck size={16} />
            <div>
              <div className="prNoticeTitle">{t("reviews.loginCard.title")}</div>
              <div className="prNoticeDesc">{t("reviews.loginCard.desc")}</div>
            </div>
          </div>

          <button className="prBtnPrimary" onClick={() => navigate("/auth/login")}>
            {t("reviews.loginCard.cta")}
          </button>
        </div>
      ) : null}

      {/* already reviewed */}
      {user && !userCanReview ? (
        <div className="prNotice prNoticeSlim">{t("reviews.alreadyReviewed")}</div>
      ) : null}

      {/* Form */}
      {user && userCanReview ? (
        <div className="prForm">
          <div className="prFormHeader">
            <div>
              <div className="prFormTitle">{t("reviews.form.title")}</div>
              <div className="prFormSub">{t("reviews.form.sub")}</div>
            </div>

            <div className="prRatingPill" aria-label={t("reviews.form.ratingAria")}>
              <span>{t("reviews.form.rating")}:</span>
              <b>
                {rating}/5
              </b>
            </div>
          </div>

          <div className="prStarsPicker" aria-label={t("reviews.form.pickRatingAria")}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className={`prStarBtn ${s <= rating ? "isOn" : ""}`}
                aria-label={t("reviews.form.starBtnAria", { value: s })}
                title={t("reviews.form.starBtnTitle", { value: s })}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("reviews.form.placeholder")}
            rows={4}
            maxLength={900}
          />

          <div className="prFormFooter">
            <div className="prTiny">{t("reviews.form.tip")}</div>

            <button
              className="prBtnPrimary"
              onClick={handleAddReview}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? t("reviews.form.sending") : t("reviews.form.submit")}
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
            <div className="prEmptyTitle">{t("reviews.empty.title")}</div>
            <div className="prEmptyDesc">{t("reviews.empty.desc")}</div>
          </div>
        ) : (
          sortedReviews.map((r) => (
            <div key={r.id} className="prItem">
              <div className="prAvatar" title={r.userName}>
                {initials(r.userName, t("reviews.avatarFallback"))}
              </div>

              <div className="prBody">
                <div className="prTopRow">
                  <span className="prName">{r.userName}</span>
                  <Stars value={r.rating} t={t} />

                  <span className="prDate">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString(locale) : "—"}
                  </span>

                  {user && r.userId && String(r.userId) === String(user._id) ? (
                    <button
                      className="prBtnTiny"
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      aria-label={t("reviews.deleteAria")}
                      title={t("reviews.delete")}
                    >
                      <Trash2 size={14} />
                      {t("reviews.delete")}
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
            {t("reviews.loadMore")}
          </button>
        </div>
      ) : null}

      {!loading && !hasMore && sortedReviews.length > 0 ? (
        <div className="prEndHint">{t("reviews.end")}</div>
      ) : null}
    </section>
  );
}

