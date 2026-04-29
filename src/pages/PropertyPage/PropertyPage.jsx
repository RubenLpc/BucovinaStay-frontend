import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getPropertyById } from "../../api/propertyService";
import PropertyReviews from "../../components/PropertyReviews/PropertyReviews";
import { useAuthStore } from "../../stores/authStore";
import { useFavorites } from "../../hooks/useFavorites";
import HostSection from "../../components/HostSection/HostSection";
import MessageHostModal from "../../components/HostSection/MessageHostModal";
import { sendHostMessage } from "../../api/hostMessagesService";
import { trackImpression, trackClick } from "../../api/analyticsService";
import { getHostProfilePublic } from "../../api/hostProfileService";
import defaultAvatar from "../../assets/default_avatar.png";
import { AMENITY_BY_KEY } from "../../constants/amenitiesCatalog";

import { toast } from "sonner";
import "./PropertyPage.css";

import {
  Heart,
  Share2,
  Star,
  MapPin,
  Users,
  Home,
  Trophy,
  Sparkles,
  Car,
  X,
  ChevronLeft,
  ChevronRight,
  Images as ImagesIcon,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
} from "lucide-react";

import { useTranslation } from "react-i18next";

const TYPE_LABELS = {
  apartament: "Apartament",
  pensiune: "Pensiune",
  cabana: "Cabană",
  hotel: "Hotel",
  vila: "Vilă",
  tiny_house: "Tiny House",
};

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function hasValue(v) {
  return v !== null && v !== undefined && v !== "";
}
function formatMoney(value, currency = "RON") {
  try {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  } catch {
    return `${value ?? 0} ${currency || ""}`.trim();
  }
}

function clampText(text, n = 320) {
  if (!isNonEmptyString(text)) return "";
  const t = text.trim();
  if (t.length <= n) return t;
  return t.slice(0, n).trim() + "…";
}

function StarRating({ value, max = 5, size = 15 }) {
  return (
    <div className="ppStars" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => {
        const pct = Math.min(100, Math.max(0, (value - i) * 100));
        const gId = `pps-${i}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={gId}>
                <stop offset={`${pct}%`} stopColor="#f59e0b" />
                <stop offset={`${pct}%`} stopColor="currentColor" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#${gId})`}
            />
          </svg>
        );
      })}
    </div>
  );
}

function Modal({ open, title, onClose, children, size = "lg", closeLabel = "Închide" }) {
  if (!open) return null;
  return (
    <div className="ppModalOverlay" role="dialog" aria-modal="true">
      <div className={`ppModal ppModal-${size}`}>
        <button className="ppModalClose" onClick={onClose} aria-label={closeLabel}>
          <X size={18} />
        </button>
        {title ? <h2 className="ppModalTitle">{title}</h2> : null}
        <div className="ppModalBody">{children}</div>
      </div>
      <button className="ppModalBackdrop" onClick={onClose} aria-label={closeLabel} />
    </div>
  );
}

export default function PropertyPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  useEffect(() => {
    if (!id) return;
    const key = `pp:view:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackImpression([id]);
  }, [id]);

  const [loading, setLoading] = useState(true);
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");

  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [lbZoomed, setLbZoomed] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { favIds, toggle: toggleFav, loading: favLoading } = useFavorites(!!user);

  const [hostUser, setHostUser] = useState(null);
  const [hostProfile, setHostProfile] = useState(null);
  const [hostProfileLoading, setHostProfileLoading] = useState(false);

  const [msgOpen, setMsgOpen] = useState(false);

  const DEFAULT_HOST_AVATAR = defaultAvatar;

  const isFav = useMemo(() => {
    if (!id) return false;
    return favIds.has(String(id));
  }, [favIds, id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await getPropertyById(id);
        if (!alive) return;
        setP(data.property);
        setHostUser(data.host || null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || t("propertyPage.errors.loadFailed"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, t]);

  const images = useMemo(() => {
    const list = Array.isArray(p?.images) ? p.images.map((x) => x?.url).filter(Boolean) : [];
    const cover = p?.coverImage?.url;
    if (cover && !list.includes(cover)) return [cover, ...list];
    return list.length ? list : cover ? [cover] : [];
  }, [p]);

  const title = p?.title || t("propertyPage.fallbackTitle");
  const subtitle = isNonEmptyString(p?.subtitle) ? p.subtitle : "";
  const typeLabel = p?.type ? TYPE_LABELS[p.type] || p.type : "";

  const locationLine = [p?.locality, p?.city, p?.region].filter(isNonEmptyString).join(", ");

  const price = typeof p?.pricePerNight === "number" ? p.pricePerNight : null;
  const currency = p?.currency || "RON";

  const ratingAvg = typeof p?.ratingAvg === "number" ? p.ratingAvg : 0;
  const reviewsCount = typeof p?.reviewsCount === "number" ? p.reviewsCount : 0;

  const facilities = useMemo(() => {
    const arr = Array.isArray(p?.facilities) ? p.facilities : [];
    return arr.filter((k) => AMENITY_BY_KEY[k]);
  }, [p]);

  const coords = useMemo(() => {
    const c = p?.geo?.coordinates;
    if (!Array.isArray(c) || c.length !== 2) return null;
    const [lng, lat] = c;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lat, lng };
  }, [p]);

  const canShowHighlights = ratingAvg > 0 && reviewsCount > 0;

  const hostFromProperty = p?.hostId && typeof p.hostId === "object" ? p.hostId : null;
  const hostUserId =
    hostFromProperty?._id ||
    hostUser?._id ||
    (typeof p?.hostId === "string" ? p.hostId : null) ||
    null;

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!hostUserId) {
        setHostProfile(null);
        return;
      }
      try {
        setHostProfileLoading(true);
        const res = await getHostProfilePublic(hostUserId);
        if (!alive) return;
        setHostProfile(res?.host || null);
      } catch {
        if (!alive) return;
        setHostProfile(null);
      } finally {
        if (alive) setHostProfileLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [hostUserId]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft")  { setLbZoomed(false); setLightboxIdx((i) => (i - 1 + images.length) % images.length); }
      if (e.key === "ArrowRight") { setLbZoomed(false); setLightboxIdx((i) => (i + 1) % images.length); }
      if (e.key === "Escape")     { setLightboxIdx(null); setLbZoomed(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, images.length]);

  const quickFacts = useMemo(() => {
    const items = [];

    if (hasValue(typeLabel)) items.push({ Icon: Home, text: t("propertyPage.facts.entirePlace", { type: typeLabel }) });
    if (typeof p?.capacity === "number" && p.capacity > 0)
      items.push({ Icon: Users, text: t("propertyPage.facts.guests", { count: p.capacity }) });

    if (isNonEmptyString(p?.addressLine)) items.push({ Icon: MapPin, text: p.addressLine.trim() });

    return items;
  }, [p, typeLabel, t]);

  const displayedAmenities = facilities.slice(0, 8);
  const remainingAmenitiesCount = Math.max(0, facilities.length - displayedAmenities.length);

  const mapEmbedSrc = useMemo(() => {
    if (coords) {
      return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=13&output=embed`;
    }
    const q = encodeURIComponent(p?.city || p?.locality || "Bucovina");
    return `https://www.google.com/maps?q=${q}&z=12&output=embed`;
  }, [coords, p]);

  const hostName =
    hostProfile?.displayName ||
    hostProfile?.name ||
    hostFromProperty?.name ||
    hostUser?.name ||
    t("propertyPage.host.fallbackName");

  const hostPhone = hostFromProperty?.phone || hostUser?.phone || "";

  const hostAvatar =
    (isNonEmptyString(hostProfile?.avatarUrl) && hostProfile.avatarUrl) || DEFAULT_HOST_AVATAR;

  const hostBio = (isNonEmptyString(hostProfile?.bio) && hostProfile.bio.trim()) || "";

  const hasPhone = typeof hostPhone === "string" && hostPhone.trim().length > 0;
  const cleanPhone = (s) => String(s || "").replace(/[^\d+]/g, "");
  const telHref = hasPhone ? `tel:${cleanPhone(hostPhone)}` : "";
  const waHref = hasPhone ? `https://wa.me/${cleanPhone(hostPhone).replace(/^\+/, "")}` : "";
  const smsHref = hasPhone ? `sms:${cleanPhone(hostPhone)}` : "";

  const onShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title, url });
        toast.success(t("propertyPage.toasts.shared"));
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("propertyPage.toasts.linkCopied.title"), {
          description: t("propertyPage.toasts.linkCopied.desc"),
        });
      }
    } catch {
      // ignore
    }
  };

  const onSave = async () => {
    if (!user) {
      toast.info(t("propertyPage.toasts.authRequired.title"), {
        description: t("propertyPage.toasts.authRequired.desc"),
      });
      return;
    }

    try {
      await toggleFav(String(id));
      // toast-urile add/remove le ai deja în hook/service
    } catch (e) {
      toast.error(t("propertyPage.toasts.favError.title"), {
        description: e?.message || t("propertyPage.toasts.favError.desc"),
      });
    }
  };

  async function handleSendMessage({ propertyId, message, guestName, guestEmail, guestPhone }) {
    await sendHostMessage({ propertyId, message, guestName, guestEmail, guestPhone });
    toast.success(t("propertyPage.toasts.messageSent"));
  }

  if (loading) {
    return (
      <div className="ppShell">
        <div className="ppContainer">
          <div className="ppSkeletonTitle" />
          <div className="ppSkeletonGallery" />
          <div className="ppGrid">
            <div className="ppColLeft">
              <div className="ppSkeletonBlock" />
              <div className="ppSkeletonBlock" />
            </div>
            <div className="ppColRight">
              <div className="ppSkeletonCard" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="ppShell">
        <div className="ppContainer">
          <div className="ppErrorCard">
            <h2>{t("propertyPage.errors.title")}</h2>
            <p>{err}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!p) return null;

  return (
    <div className="ppShell">
      <div className="ppContainer">
        {/* HEADER */}
        <div className="ppHeader">
          <div className="ppHeaderLeft">
            <h1 className="ppTitle">{title}</h1>

            <div className="ppMetaRow">
              {canShowHighlights ? (
                <>
                  <span className="ppMeta">
                    <Star size={14} className="ppMetaIcon" />
                    <b>{ratingAvg.toFixed(1).replace(".", ",")}</b>
                  </span>
                  <span className="ppDot">•</span>
                  <button
                    className="ppLinkLike"
                    onClick={() =>
                      toast.info(t("propertyPage.toasts.reviewsSoon.title"), {
                        description: t("propertyPage.toasts.reviewsSoon.desc"),
                      })
                    }
                  >
                    {t("propertyPage.reviewsCount", { count: reviewsCount })}
                  </button>
                </>
              ) : null}

              {isNonEmptyString(locationLine) ? (
                <>
                  {canShowHighlights ? <span className="ppDot">•</span> : null}
                  <span className="ppMeta">
                    <MapPin size={14} className="ppMetaIcon" />
                    {locationLine}
                  </span>
                </>
              ) : null}

              {isNonEmptyString(subtitle) ? (
                <>
                  <span className="ppDot">•</span>
                  <span className="ppMeta ppMuted">{subtitle}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="ppHeaderActions">
            <button className="ppActionBtn" onClick={onShare}>
              <Share2 size={16} />
              <span>{t("propertyPage.actions.share")}</span>
            </button>

            <button
              className={`ppActionBtn ${isFav ? "isActive" : ""}`}
              onClick={onSave}
              disabled={favLoading}
              aria-pressed={isFav}
              title={isFav ? t("propertyPage.actions.removeFromFav") : t("propertyPage.actions.addToFav")}
            >
              <Heart size={16} fill={isFav ? "currentColor" : "none"} />
              <span>{isFav ? t("propertyPage.actions.saved") : t("propertyPage.actions.save")}</span>
            </button>
          </div>
        </div>

        {/* GALLERY */}
        <div className="ppGalleryWrap">
          {images.length ? (
            <div className="ppGallery">
              <button
                className="ppGalleryMain"
                onClick={() => setShowAllPhotos(true)}
                aria-label={t("propertyPage.gallery.openAria")}
              >
                <img src={images[0]} alt={t("propertyPage.gallery.mainAlt")} loading="eager" />
              </button>

              <div className="ppGallerySide">
                {(images.slice(1, 5).length ? images.slice(1, 5) : images.slice(0, 4)).map((src, idx) => (
                  <button
                    key={src + idx}
                    className="ppGalleryThumb"
                    onClick={() => setShowAllPhotos(true)}
                    aria-label={t("propertyPage.gallery.openAria")}
                  >
                    <img src={src} alt={t("propertyPage.gallery.thumbAlt", { n: idx + 2 })} loading="lazy" />
                  </button>
                ))}
              </div>

              <button
                className="ppAllPhotosBtn"
                onClick={() => {
                  trackClick(id, "contact_gallery");
                  setShowAllPhotos(true);
                }}
              >
                <ImagesIcon size={16} />
                {t("propertyPage.gallery.showAll")}
              </button>
            </div>
          ) : (
            <div className="ppGalleryEmpty">
              <div className="ppGalleryEmptyInner">
                <ImagesIcon size={22} />
                <span>{t("propertyPage.gallery.empty")}</span>
              </div>
            </div>
          )}
        </div>

        {/* MAIN GRID */}
        <div className="ppGrid">
          {/* LEFT */}
          <div className="ppColLeft">
            <div className="ppSection">
              <h2 className="ppH2">
                {typeLabel
                  ? t("propertyPage.headlineWithCity", { type: typeLabel, city: p?.city || t("propertyPage.regionFallback") })
                  : t("propertyPage.detailsTitle")}
              </h2>

              {quickFacts.length ? (
                <div className="ppFactsRow">
                  {quickFacts.map(({ Icon, text }) => (
                    <div className="ppFact" key={text}>
                      <div className="ppFactIcon"><Icon size={16} /></div>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {Array.isArray(p?.badges) && p.badges.filter(isNonEmptyString).length ? (
                <div className="ppBadges">
                  {p.badges
                    .filter(isNonEmptyString)
                    .slice(0, 6)
                    .map((b) => (
                      <span key={b} className="ppBadge">
                        {b}
                      </span>
                    ))}
                </div>
              ) : null}

              {canShowHighlights ? (
                <div className="ppHighlights">
                  {ratingAvg >= 4.8 && reviewsCount >= 10 ? (
                    <div className="ppHighlightItem ppHighlightItem--amber">
                      <div className="ppHighlightIcon ppHighlightIcon--amber"><Trophy size={17} /></div>
                      <div>
                        <div className="ppHighlightTitle">{t("propertyPage.highlights.topRatedTitle")}</div>
                        <div className="ppHighlightDesc">{t("propertyPage.highlights.topRatedDesc")}</div>
                      </div>
                    </div>
                  ) : null}

                  {facilities.includes("spa") ? (
                    <div className="ppHighlightItem ppHighlightItem--teal">
                      <div className="ppHighlightIcon ppHighlightIcon--teal"><Sparkles size={17} /></div>
                      <div>
                        <div className="ppHighlightTitle">{t("propertyPage.highlights.relaxTitle")}</div>
                        <div className="ppHighlightDesc">{t("propertyPage.highlights.relaxDesc")}</div>
                      </div>
                    </div>
                  ) : null}

                  {facilities.includes("parking") ? (
                    <div className="ppHighlightItem ppHighlightItem--blue">
                      <div className="ppHighlightIcon ppHighlightIcon--blue"><Car size={17} /></div>
                      <div>
                        <div className="ppHighlightTitle">{t("propertyPage.highlights.parkingTitle")}</div>
                        <div className="ppHighlightDesc">{t("propertyPage.highlights.parkingDesc")}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="ppDivider" />

              {isNonEmptyString(p?.description) ? (
                <>
                  <p className="ppDesc">{clampText(p.description, 420)}</p>
                  {p.description.trim().length > 420 ? (
                    <button className="ppOutlineBtn" onClick={() => setShowFullDescription(true)}>
                      {t("propertyPage.actions.showMore")} <ChevronRight size={16} />
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="ppMuted">{t("propertyPage.descriptionMissing")}</p>
              )}
            </div>

            {facilities.length ? (
              <div className="ppSection">
                <h2 className="ppH2">{t("propertyPage.amenitiesTitle")}</h2>

                <div className="ppAmenitiesGrid">
                  {displayedAmenities.map((key) => {
                    const meta = AMENITY_BY_KEY[key];
                    if (!meta) return null;
                    const Icon = meta.icon; // ✅ corect: în catalog este "icon"
                    return (
                      <div className="ppAmenity" key={key}>
                        {Icon ? <div className="ppAmenityIcon"><Icon size={16} /></div> : null}
                        <span>{meta.label || key}</span>
                      </div>
                    );
                  })}
                </div>

                <button className="ppOutlineBtn" onClick={() => setShowAllAmenities(true)}>
                  {t("propertyPage.actions.showAllAmenities", { count: facilities.length })}
                </button>

                {remainingAmenitiesCount > 0 ? (
                  <div className="ppTinyHint">{t("propertyPage.moreAmenities", { count: remainingAmenitiesCount })}</div>
                ) : null}
              </div>
            ) : null}

            <div className="ppSection">
              <h2 className="ppH2">{t("propertyPage.reviewsTitle")}</h2>

              {reviewsCount > 0 && ratingAvg > 0 ? (
                <div className="ppReviewSummary">
                  <div className="ppReviewScore">
                    <div className="ppScoreDisplay">
                      <div className="ppScoreNum">{ratingAvg.toFixed(1).replace(".", ",")}</div>
                      <div className="ppScoreRight">
                        <StarRating value={ratingAvg} size={16} />
                        <div className="ppMuted ppScoreCount">{t("propertyPage.reviewsBasedOn", { count: reviewsCount })}</div>
                      </div>
                    </div>
                  </div>

                  <div className="ppReviewNote">
                    <ShieldCheck size={18} />
                    <div>
                      <div className="ppHighlightTitle">{t("propertyPage.verifiedReviews.title")}</div>
                      <div className="ppHighlightDesc">{t("propertyPage.verifiedReviews.desc")}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ppEmptyBlock">
                  <div className="ppEmptyTitle">{t("propertyPage.noReviews.title")}</div>
                  <div className="ppMuted">{t("propertyPage.noReviews.desc")}</div>
                </div>
              )}
            </div>

            {isNonEmptyString(p?.city) || coords ? (
              <div className="ppSection">
                <h2 className="ppH2">{t("propertyPage.mapTitle")}</h2>
                {isNonEmptyString(locationLine) ? <div className="ppMuted">{locationLine}</div> : null}

                <div className="ppMapWrap">
                  <iframe
                    title={t("propertyPage.mapFrameTitle")}
                    src={mapEmbedSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {!coords ? (
                    <div className="ppMapOverlayNote">{t("propertyPage.mapApprox")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT */}
          <div className="ppColRight">
            <div className="ppBookingCard">
              <div className="ppBookingTop">
                {typeof price === "number" && price > 0 ? (
                  <div className="ppPriceRow">
                    <span className="ppPrice">{formatMoney(price, currency)}</span>
                    <span className="ppMuted">{t("propertyPage.perNight")}</span>
                  </div>
                ) : (
                  <div className="ppMuted">{t("propertyPage.priceUnavailable")}</div>
                )}

                {canShowHighlights ? (
                  <div className="ppBookingRating">
                    <Star size={14} />
                    <b>{ratingAvg.toFixed(1).replace(".", ",")}</b>
                    <span className="ppDot">•</span>
                    <span className="ppMuted">{t("propertyPage.reviewsCount", { count: reviewsCount })}</span>
                  </div>
                ) : null}
              </div>

              <div className="ppContactBlock">
                <div className="ppContactTitle">{t("propertyPage.contact.title")}</div>
                <div className="ppContactSubtitle">
                  {t("propertyPage.contact.subtitle", { host: hostName })}
                </div>

                <div className="ppContactButtons">
                  {hasPhone ? (
                    <a
                      className="ppPrimaryBtn ppPrimaryBtnSolid"
                      href={telHref}
                      onClick={() => trackClick(id, "contact_phone")}
                    >
                      {t("propertyPage.contact.callNow")}
                    </a>
                  ) : (
                    <button
                      className="ppPrimaryBtn ppPrimaryBtnSolid"
                      onClick={() =>
                        toast.info(t("propertyPage.toasts.phoneMissing.title"), {
                          description: t("propertyPage.toasts.phoneMissing.desc"),
                        })
                      }
                    >
                      {t("propertyPage.contact.callNow")}
                    </button>
                  )}

                  <a
                    className="ppOutlineBtn ppOutlineBtnFull"
                    href={smsHref}
                    onClick={() => trackClick(id, "contact_sms")}
                  >
                    {t("propertyPage.contact.sendSms")}
                  </a>

                  {hasPhone ? (
                    <a
                      className="ppOutlineBtn ppOutlineBtnFull"
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackClick(id, "contact_whatsapp")}
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>

                <div className="ppContactHint">
                  <ShieldCheck size={16} />
                  <span>{t("propertyPage.contact.hint")}</span>
                </div>
              </div>

              <div className="ppBookingDivider" />

              <div className="ppMiniRecap">
                {typeof price === "number" && price > 0 ? (
                  <div className="ppMiniRow">
                    <span>{t("propertyPage.recap.nightLabel", { price: formatMoney(price, currency) })}</span>
                    <b>{formatMoney(price, currency)}</b>
                  </div>
                ) : null}

                <div className="ppMiniRow">
                  <span className="ppMuted">{t("propertyPage.recap.location")}</span>
                  <b>{p?.city || p?.locality || "—"}</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hostUserId ? (
          <>
            <HostSection
              host={{
                id: hostUserId,
                name: hostName,
                avatarUrl: hostAvatar,
                bio: hostBio,
                verified: !!hostProfile?.verified,
                isSuperHost: !!hostProfile?.isSuperHost,
                hostingSince: hostProfile?.hostingSince || null,
                responseRate: hostProfile?.responseRate ?? null,
                responseTimeBucket: hostProfile?.responseTimeBucket || "unknown",
                languages: Array.isArray(hostProfile?.languages) ? hostProfile.languages : [],
                stats: hostProfile?.stats || null,
              }}
              loading={hostProfileLoading}
              property={p}
              onMessage={() => setMsgOpen(true)}
            />

            <MessageHostModal
              open={msgOpen}
              onClose={() => setMsgOpen(false)}
              host={{ id: hostUserId, name: hostName, avatarUrl: hostAvatar }}
              property={p}
              onSend={handleSendMessage}
            />
          </>
        ) : null}

        <div style={{ marginTop: 28 }}>
          <PropertyReviews propertyId={id} />
        </div>

        {/* MODALS */}
        <Modal
          open={showAllPhotos}
          title=""
          onClose={() => setShowAllPhotos(false)}
          size="xl"
          closeLabel={t("common.close")}
        >
          <div className="ppPhotoModalHeader">
            <div className="ppPhotoModalTitle">{t("propertyPage.gallery.photosTitle")}</div>
            <div className="ppMuted">{t("propertyPage.gallery.imagesCount", { count: images.length })}</div>
          </div>

          <div className="ppPhotoGrid">
            {images.map((src, idx) => (
              <button
                className="ppPhotoCell"
                key={src + idx}
                onClick={() => { setLbZoomed(false); setLightboxIdx(idx); }}
                aria-label={t("propertyPage.gallery.photoAlt", { n: idx + 1 })}
              >
                <img src={src} alt={t("propertyPage.gallery.photoAlt", { n: idx + 1 })} loading="lazy" />
              </button>
            ))}
          </div>
        </Modal>

        <Modal
          open={showAllAmenities}
          title={t("propertyPage.amenitiesTitle")}
          onClose={() => setShowAllAmenities(false)}
          size="lg"
          closeLabel={t("common.close")}
        >
          <div className="ppAmenityList">
            {facilities.map((key) => {
              const meta = AMENITY_BY_KEY[key];
              if (!meta) return null;
              const Icon = meta.icon; // ✅ corect
              return (
                <div className="ppAmenityRow" key={key}>
                  {Icon ? <Icon size={20} /> : null}
                  <span>{meta.labelKey ? t(meta.labelKey) : (meta.label || key)}</span>
                </div>
              );
            })}
          </div>
        </Modal>

        <Modal
          open={showFullDescription}
          title={t("propertyPage.fullDescTitle")}
          onClose={() => setShowFullDescription(false)}
          size="lg"
          closeLabel={t("common.close")}
        >
          <div className="ppFullDesc">
            {isNonEmptyString(p?.description) ? (
              <p>{p.description.trim()}</p>
            ) : (
              <p className="ppMuted">{t("propertyPage.descriptionUnavailable")}</p>
            )}

            <div className="ppFullDescMeta">
              {isNonEmptyString(locationLine) ? (
                <div className="ppFullDescLine">
                  <MapPin size={16} /> <span>{locationLine}</span>
                </div>
              ) : null}
              {typeLabel ? (
                <div className="ppFullDescLine">
                  <Home size={16} /> <span>{typeLabel}</span>
                </div>
              ) : null}
              {typeof p?.capacity === "number" && p.capacity > 0 ? (
                <div className="ppFullDescLine">
                  <Users size={16} /> <span>{t("propertyPage.facts.maxGuests", { count: p.capacity })}</span>
                </div>
              ) : null}
            </div>
          </div>
        </Modal>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxIdx !== null ? (
        <div
          className="ppLightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("propertyPage.gallery.photosTitle")}
          onClick={() => { setLightboxIdx(null); setLbZoomed(false); }}
        >
          <button
            className="ppLbBtn ppLbClose"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); setLbZoomed(false); }}
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>

          {images.length > 1 ? (
            <>
              <button
                className="ppLbBtn ppLbNav ppLbPrev"
                onClick={(e) => { e.stopPropagation(); setLbZoomed(false); setLightboxIdx((i) => (i - 1 + images.length) % images.length); }}
                aria-label="Foto anterioară"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                className="ppLbBtn ppLbNav ppLbNext"
                onClick={(e) => { e.stopPropagation(); setLbZoomed(false); setLightboxIdx((i) => (i + 1) % images.length); }}
                aria-label="Foto următoare"
              >
                <ChevronRight size={22} />
              </button>
            </>
          ) : null}

          <div
            className={`ppLbImgWrap${lbZoomed ? " is-zoomed" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIdx]}
              alt={t("propertyPage.gallery.photoAlt", { n: lightboxIdx + 1 })}
              className="ppLbImg"
              draggable="false"
              onClick={() => setLbZoomed((z) => !z)}
            />
          </div>

          <div className="ppLbBar" onClick={(e) => e.stopPropagation()}>
            <span className="ppLbCounter">{lightboxIdx + 1} / {images.length}</span>
            <button
              className="ppLbBtn ppLbZoomBtn"
              onClick={() => setLbZoomed((z) => !z)}
              aria-label={lbZoomed ? "Zoom out" : "Zoom in"}
            >
              {lbZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
              {lbZoomed ? "Zoom out" : "Zoom in"}
            </button>
            <span className="ppLbHint">← →  navighează  ·  Esc  închide</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
