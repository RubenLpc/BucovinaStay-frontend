import React, { useMemo } from "react";
import "./HostSection.css";
import { ShieldCheck, Star, MessageSquareText, BadgeCheck } from "lucide-react";
import defaultAvatar from "../../assets/default_avatar.png";
import { useTranslation } from "react-i18next";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatPct(v, dash = "—") {
  if (v == null) return dash;
  const x = clamp(Number(v), 0, 100);
  return `${Math.round(x)}%`;
}

function monthsLabel(months, t) {
  if (months == null) return t("hostSection.stats.monthsLabelFallback");
  const n = Number(months);
  if (!Number.isFinite(n) || n <= 0) return t("hostSection.stats.monthsLabelFallback");

  // RO pluralization simplu / EN diferit
  // folosim t cu count (ideal), dar rămânem compatibili:
  return t("hostSection.stats.monthsLabel", { count: n, months: n });
}

function responseTimeText(bucket, explicitText, t) {
  if (explicitText) return explicitText;

  if (bucket === "within_hour") return t("hostSection.details.responseTimeT.withinHour");
  if (bucket === "within_day") return t("hostSection.details.responseTimeT.withinDay");
  if (bucket === "few_days") return t("hostSection.details.responseTimeT.fewDays");
  return "—";
}

export default function HostSection({ host, property, onMessage }) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const propReviews = Number(property?.reviewsCount || 0);
    const propRating = property?.ratingAvg ?? null;

    return {
      reviews: host?.reviewsCount ?? propReviews ?? 0,
      rating: host?.rating ?? propRating ?? null,
      months: host?.monthsHosting ?? null,
    };
  }, [host, property]);

  const isSuperHost = Boolean(host?.isSuperHost);
  const isVerified = Boolean(host?.verified);
  const DEFAULT_HOST_AVATAR = defaultAvatar;

  const hostName = host?.name || t("hostSection.fallbackHostName");

  const rating =
    stats.rating == null || !Number.isFinite(Number(stats.rating))
      ? null
      : Number(stats.rating);

  return (
    <section className="hsWrap" aria-label={t("hostSection.aria.section")}>
      <h2 className="hsTitle">{t("hostSection.title")}</h2>

      <div className="hsGrid">
        {/* LEFT CARD */}
        <div className="hsCard">
          <div className="hsCardTop">
            <div className="hsAvatarWrap">
              <img
                className="hsAvatar"
                src={host?.avatarUrl || DEFAULT_HOST_AVATAR}
                alt={t("hostSection.aria.avatarAlt", { name: hostName })}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_HOST_AVATAR;
                }}
              />

              {isSuperHost ? (
                <div className="hsBadge" title={t("hostSection.badges.superhost")}>
                  <ShieldCheck size={16} />
                </div>
              ) : null}
            </div>

            <div className="hsNameBlock">
              <div className="hsName">{hostName}</div>

              <div className="hsSubtitle">
                {isSuperHost ? (
                  <span className="hsBadgeInline super">
                    <ShieldCheck size={14} />
                    {t("hostSection.badges.superhost")}
                  </span>
                ) : null}

                {isVerified ? (
                  <span className="hsBadgeInline verified">
                    <BadgeCheck size={14} />
                    {t("hostSection.badges.verified")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="hsStats">
              <div className="hsStat">
                <div className="hsStatValue">{Number(stats.reviews || 0)}</div>
                <div className="hsStatLabel">{t("hostSection.stats.reviews")}</div>
              </div>

              <div className="hsDivider" />

              <div className="hsStat">
                <div className="hsStatValue">
                  {rating == null ? "—" : rating.toFixed(1)}
                  <span className="hsStar" aria-hidden="true">
                    <Star size={16} />
                  </span>
                </div>
                <div className="hsStatLabel">{t("hostSection.stats.score")}</div>
              </div>

              <div className="hsDivider" />

              <div className="hsStat">
                <div className="hsStatValue">{stats.months == null ? "—" : stats.months}</div>
                <div className="hsStatLabel">{monthsLabel(stats.months, t)}</div>
              </div>
            </div>
          </div>

          {host?.bio ? <p className="hsBio">{host.bio}</p> : null}
        </div>

        {/* RIGHT PANEL */}
        <div className="hsRight">
          <div className="hsRightBox">
            <div className="hsRightTitle">
              {t("hostSection.right.title", {
                name: hostName,
                kind: isSuperHost ? t("hostSection.badges.superhost") : t("hostSection.right.host"),
              })}
            </div>

            <p className="hsRightText">
              {isSuperHost ? t("hostSection.right.textSuper") : t("hostSection.right.textNormal")}
            </p>

            <div className="hsRightHr" />

            <div className="hsRightSubtitle">{t("hostSection.details.title")}</div>

            <div className="hsDetails">
              <div className="hsRow">
                <span className="hsKey">{t("hostSection.details.responseRate")}</span>
                <span className="hsVal">{formatPct(host?.responseRate)}</span>
              </div>

              <div className="hsRow">
                <span className="hsKey">{t("hostSection.details.responseTime")}</span>
                <span className="hsVal">
                  {responseTimeText(host?.responseTimeBucket, host?.responseTimeText, t)}
                </span>
              </div>

              {Array.isArray(host?.languages) && host.languages.length > 0 ? (
                <div className="hsRow hsRowStack">
                  <span className="hsKey">{t("hostSection.details.languages")}</span>
                  <div className="hsLangs">
                    {host.languages.slice(0, 8).map((l) => (
                      <span key={l} className="hsLangChip">
                        {String(l).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <button className="hsBtn" type="button" onClick={() => onMessage?.()}>
              <MessageSquareText size={18} />
              {t("hostSection.cta")}
            </button>

            {host?.disclaimer ? (
              <div className="hsDisclaimer">
                <a
                  href={host?.disclaimerHref || "#"}
                  onClick={(e) => !host?.disclaimerHref && e.preventDefault()}
                >
                  {host.disclaimer}
                </a>
              </div>
            ) : null}

            <div className="hsNote">{t("hostSection.note")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
