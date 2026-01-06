import React, { useMemo } from "react";
import "./HostSection.css";
import { ShieldCheck, Star, MessageSquareText, BadgeCheck } from "lucide-react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatPct(v) {
  if (v == null) return "—";
  const x = clamp(Number(v), 0, 100);
  return `${Math.round(x)}%`;
}

export default function HostSection({ host,property, onMessage }) {
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

  return (
    <section className="hsWrap">
      <h2 className="hsTitle">Fă cunoștință cu gazda ta</h2>

      <div className="hsGrid">
        {/* LEFT CARD */}
        <div className="hsCard">
          <div className="hsCardTop">
            <div className="hsAvatarWrap">
              <img
                className="hsAvatar"
                src={host?.avatarUrl || "https://i.pravatar.cc/160?img=12"}
                alt={`Avatar ${host?.name || "Gazdă"}`}
                loading="lazy"
              />
              {isSuperHost ? (
                <div className="hsBadge" title="Super-gazdă">
                  <ShieldCheck size={16} />
                </div>
              ) : null}
            </div>

            <div className="hsNameBlock">
              <div className="hsName">{host?.name || "Gazdă"}</div>

              <div className="hsSubtitle">
                {isSuperHost ? "Super-gazdă" : "Gazdă"}
                {isVerified ? (
                  <span className="hsVerified" title="Verificat">
                    <BadgeCheck size={16} />
                    Verificat
                  </span>
                ) : null}
              </div>
            </div>

            <div className="hsStats">
              <div className="hsStat">
                <div className="hsStatValue">{stats.reviews}</div>
                <div className="hsStatLabel">Recenzii</div>
              </div>

              <div className="hsDivider" />

              <div className="hsStat">
                <div className="hsStatValue">
                  {stats.rating == null ? "—" : Number(stats.rating).toFixed(1)}
                  <span className="hsStar">
                    <Star size={16} />
                  </span>
                </div>
                <div className="hsStatLabel">Scor</div>
              </div>

              <div className="hsDivider" />

              <div className="hsStat">
                <div className="hsStatValue">{stats.months == null ? "—" : stats.months}</div>
                <div className="hsStatLabel">Luni de experiență</div>
              </div>
            </div>
          </div>

          {host?.bio ? <p className="hsBio">{host.bio}</p> : null}
        </div>

        {/* RIGHT PANEL */}
        <div className="hsRight">
          <div className="hsRightBox">
            <div className="hsRightTitle">
              {host?.name || "Gazda"} {isSuperHost ? "este o Super-gazdă" : "este o gazdă"}
            </div>

            <p className="hsRightText">
              {isSuperHost
                ? "Super-gazdele sunt gazde cu experiență, evaluate la superlativ, care se angajează să ofere oaspeților șederi de excepție."
                : "Gazdele oferă oaspeților sprijin și informații pentru o ședere cât mai bună."}
            </p>

            <div className="hsRightHr" />

            <div className="hsRightSubtitle">Detalii despre gazdă</div>

            <div className="hsDetails">
              <div className="hsRow">
                <span className="hsKey">Rată de răspuns:</span>
                <span className="hsVal">{formatPct(host?.responseRate)}</span>
              </div>
              <div className="hsRow">
                <span className="hsKey">Timp de răspuns:</span>
                <span className="hsVal">{host?.responseTimeText || "—"}</span>
              </div>
            </div>

            <button className="hsBtn" onClick={() => onMessage?.()}>
              <MessageSquareText size={18} />
              Trimite un mesaj gazdei
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

            <div className="hsNote">
              Pentru a-ți proteja plata, folosește întotdeauna platforma pentru a trimite bani și a comunica cu gazdele.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
