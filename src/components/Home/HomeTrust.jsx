import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HomeTrust.css";
import { ShieldCheck, BadgeCheck, Star, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCountUp } from "../../hooks/useCountUp";

function formatNumber(n, locale) {
  if (typeof n !== "number") return "";
  return n.toLocaleString(locale);
}
function formatRating(n, locale) {
  if (typeof n !== "number") return "";
  const s = n.toFixed(1);
  return locale === "ro-RO" ? s.replace(".", ",") : s;
}

function TrustPill({ icon: Icon, label }) {
  return (
    <span className="htsPill">
      <Icon size={14} />
      <span>{label}</span>
    </span>
  );
}

function AnimatedNum({ target, run, locale, isRating = false }) {
  const val = useCountUp(target, { run, decimals: isRating ? 1 : 0, duration: 1500 });
  if (!run) return isRating ? formatRating(target, locale) : formatNumber(target, locale);
  return isRating ? formatRating(val, locale) : formatNumber(val, locale);
}

function TrustCard({
  icon: Icon,
  kicker,
  title,
  desc,
  pill,
  tone = "neutral",
  loading = false,
  disabled = false,
  rawNum,
  rawNumIsRating,
  countRun,
  locale,
}) {
  return (
    <div className={`htsCard tone-${tone} ${loading ? "isLoading" : ""} ${disabled ? "isDisabled" : ""}`}>
      <div className="htsTop">
        <div className="htsIcon">
          <Icon size={18} />
        </div>
        {pill ? <TrustPill icon={pill.icon} label={pill.label} /> : null}
      </div>

      <div className="htsBody">
        <div className="htsKicker">{kicker}</div>
        {rawNum != null ? (
          <div className="htsTitle htsAnimTitle">
            <AnimatedNum target={rawNum} run={countRun} locale={locale} isRating={rawNumIsRating} />
            {rawNumIsRating ? <span className="htsTitleSuffix"> / 5</span> : null}
          </div>
        ) : (
          <div className="htsTitle">{title}</div>
        )}
        <div className="htsDesc">{desc}</div>
      </div>

      <div className="htsShimmer" aria-hidden="true" />
    </div>
  );
}

export default function HomeTrustStrip({
  metrics,
  loading = false,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ro-RO";

  const sectionRef = useRef(null);
  const [countRun, setCountRun] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCountRun(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const m = metrics || {};
  const hasRating = typeof m.avgRating === "number" && typeof m.reviewsCount === "number" && m.reviewsCount > 0;
  const hasVerified = typeof m.verifiedHosts === "number" && m.verifiedHosts > 0;
  const hasStays = typeof m.staysCount === "number" && m.staysCount > 0;

  const ratingDesc = hasRating
    ? t("homeTrust.ratingDesc", { count: formatNumber(m.reviewsCount, locale) })
    : t("homeTrust.newDesc", "Ratings appear after the first stays.");

  const verifiedTitle = hasVerified
    ? t("homeTrust.verifiedTitle", { count: formatNumber(m.verifiedHosts, locale) })
    : t("homeTrust.verifiedTitleEmpty", "Verified hosts");

  const verifiedDesc = t("homeTrust.verifiedDesc", "Hosts complete verification steps for higher trust.");
  const secureTitle = t("homeTrust.secureTitle", "Secure & supported");
  const secureDesc = t("homeTrust.secureDesc", "We protect contact and help you resolve issues fast.");

  const staysTitle = hasStays
    ? t("homeTrust.staysTitle", { count: formatNumber(m.staysCount, locale) })
    : t("homeTrust.staysTitleEmpty", "Curated stays");

  const staysDesc = t("homeTrust.staysDesc", "Handpicked listings focused on Bucovina.");

  const cards = useMemo(
    () => [
      {
        icon: Star,
        kicker: t("homeTrust.kickerRating", "Guest ratings"),
        title: hasRating ? `${formatRating(m.avgRating, locale)} / 5` : t("homeTrust.newTitle", "New on the platform"),
        rawNum: hasRating ? m.avgRating : null,
        rawNumIsRating: true,
        desc: ratingDesc,
        pill: { icon: Sparkles, label: t("homeTrust.ratingPill", "Live") },
        tone: "good",
        disabled: !hasRating && !loading,
      },
      {
        icon: BadgeCheck,
        kicker: t("homeTrust.kickerVerified", "Verified"),
        title: verifiedTitle,
        rawNum: hasVerified ? m.verifiedHosts : null,
        rawNumIsRating: false,
        desc: verifiedDesc,
        pill: { icon: BadgeCheck, label: t("homeTrust.verifiedPill", "Verified") },
        tone: "info",
        disabled: !hasVerified && !loading,
      },
      {
        icon: ShieldCheck,
        kicker: t("homeTrust.kickerSecure", "Trust & safety"),
        title: secureTitle,
        rawNum: null,
        desc: secureDesc,
        pill: { icon: ShieldCheck, label: t("homeTrust.securePill", "Secure") },
        tone: "neutral",
        disabled: false,
      },
      {
        icon: Sparkles,
        kicker: t("homeTrust.kickerStays", "Bucovina"),
        title: staysTitle,
        rawNum: hasStays ? m.staysCount : null,
        rawNumIsRating: false,
        desc: staysDesc,
        pill: { icon: Sparkles, label: t("homeTrust.pillCurated", "Curated") },
        tone: "neutral",
        disabled: !hasStays && !loading,
      },
    ],
    [t, locale, m, hasRating, hasVerified, hasStays, loading, ratingDesc, verifiedTitle, verifiedDesc, secureTitle, secureDesc, staysTitle, staysDesc]
  );

  return (
    <section
      ref={sectionRef}
      className="ppSection htsWrap"
      aria-label={t("homeTrust.aria", "Trust & social proof")}
    >
      <div className="htsGrid" data-reveal-stagger>
        {cards.map((c, idx) => (
          <TrustCard
            key={idx}
            icon={c.icon}
            kicker={c.kicker}
            title={c.title}
            desc={c.desc}
            pill={c.pill}
            tone={c.tone}
            loading={loading}
            disabled={c.disabled}
            rawNum={c.rawNum}
            rawNumIsRating={c.rawNumIsRating}
            countRun={countRun}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}
