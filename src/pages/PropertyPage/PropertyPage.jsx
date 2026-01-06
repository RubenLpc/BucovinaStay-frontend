import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getPropertyById } from "../../api/propertyService";
import PropertyReviews from "../../components/PropertyReviews/PropertyReviews";
import { useAuthStore } from "../../stores/authStore";
import { useFavorites } from "../../hooks/useFavorites";
import HostSection from "../../components/HostSection/HostSection";
import MessageHostModal from "../../components/HostSection/MessageHostModal";
import { sendHostMessage } from "../../api/hostMessagesService";




import { toast } from "sonner";
import "./PropertyPage.css";

import {
  Heart,
  Share2,
  Star,
  MapPin,
  Users,
  Home,
  BedDouble,
  Bath,
  Trophy,
  DoorOpen,
  Sparkles,
  Wifi,
  Car,
  Coffee,
  PawPrint,
  CookingPot,
  Snowflake,
  Flame,
  Waves,
  X,
  ChevronRight,
  Images as ImagesIcon,
  ShieldCheck,
} from "lucide-react";

const TYPE_LABELS = {
  apartament: "Apartament",
  pensiune: "Pensiune",
  cabana: "Cabană",
  hotel: "Hotel",
  vila: "Vilă",
  tiny_house: "Tiny House",
};

const AMENITY_META = {
  wifi: { label: "Wi-Fi", Icon: Wifi },
  parking: { label: "Parcare", Icon: Car },
  breakfast: { label: "Mic dejun", Icon: Coffee },
  petFriendly: { label: "Pet-friendly", Icon: PawPrint },
  spa: { label: "Spa", Icon: Sparkles }, // ✅ fără Spa icon (nu există)
  kitchen: { label: "Bucătărie", Icon: CookingPot },
  ac: { label: "Aer condiționat", Icon: Snowflake },
  sauna: { label: "Saună", Icon: Waves },
  fireplace: { label: "Șemineu", Icon: Flame },
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

function Modal({ open, title, onClose, children, size = "lg" }) {
  if (!open) return null;
  return (
    <div className="ppModalOverlay" role="dialog" aria-modal="true">
      <div className={`ppModal ppModal-${size}`}>
        <button className="ppModalClose" onClick={onClose} aria-label="Închide">
          <X size={18} />
        </button>
        {title ? <h2 className="ppModalTitle">{title}</h2> : null}
        <div className="ppModalBody">{children}</div>
      </div>
      <button
        className="ppModalBackdrop"
        onClick={onClose}
        aria-label="Închide"
      />
    </div>
  );
}

export default function PropertyPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");

  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const user = useAuthStore((s) => s.user);
const { favIds, toggle: toggleFav, loading: favLoading } = useFavorites(!!user);


const [lightboxOpen, setLightboxOpen] = useState(false);
const [activeIndex, setActiveIndex] = useState(0);

// zoom + pan
const [zoom, setZoom] = useState(1);
const [pan, setPan] = useState({ x: 0, y: 0 });
const [dragging, setDragging] = useState(false);
const dragStart = React.useRef({ x: 0, y: 0 });
const panStart = React.useRef({ x: 0, y: 0 });


const [Host, setHost] = useState(null);

const [msgOpen, setMsgOpen] = useState(false);





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
        setHost(data.host);      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Nu am putut încărca proprietatea.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const images = useMemo(() => {
    const list = Array.isArray(p?.images)
      ? p.images.map((x) => x?.url).filter(Boolean)
      : [];
    const cover = p?.coverImage?.url;
    if (cover && !list.includes(cover)) return [cover, ...list];
    return list.length ? list : cover ? [cover] : [];
  }, [p]);

  const title = p?.title || "Proprietate";
  const subtitle = isNonEmptyString(p?.subtitle) ? p.subtitle : "";
  const typeLabel = p?.type ? TYPE_LABELS[p.type] || p.type : "";
  const locationLine = [p?.locality, p?.city, p?.county, p?.region]
    .filter(isNonEmptyString)
    .join(", ");
  const price = typeof p?.pricePerNight === "number" ? p.pricePerNight : null;
  const currency = p?.currency || "RON";

  const ratingAvg = typeof p?.ratingAvg === "number" ? p.ratingAvg : 0;
  const reviewsCount = typeof p?.reviewsCount === "number" ? p.reviewsCount : 0;

  const facilities = useMemo(() => {
    const arr = Array.isArray(p?.facilities) ? p.facilities : [];
    return arr.filter((k) => AMENITY_META[k]); // doar ce știm să randăm
  }, [p]);

  const coords = useMemo(() => {
    const c = p?.geo?.coordinates;
    if (!Array.isArray(c) || c.length !== 2) return null;
    const [lng, lat] = c;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lat, lng };
  }, [p]);

  const canShowHighlights = ratingAvg > 0 && reviewsCount > 0;

  const quickFacts = useMemo(() => {
    const items = [];

    if (hasValue(typeLabel))
      items.push({ Icon: Home, text: `Întreaga unitate • ${typeLabel}` });
    // Modelul tău are doar capacity (maxGuests). La “dormitoare/paturi/băi” nu inventăm.
    if (typeof p?.capacity === "number" && p.capacity > 0)
      items.push({ Icon: Users, text: `${p.capacity} oaspeți` });

    // dacă ai addressLine, arată-l; dacă nu, arată localitate/city.
    if (isNonEmptyString(p?.addressLine))
      items.push({ Icon: MapPin, text: p.addressLine.trim() });

    return items;
  }, [p, typeLabel]);

  const displayedAmenities = facilities.slice(0, 8);
  const remainingAmenitiesCount = Math.max(
    0,
    facilities.length - displayedAmenities.length
  );

  const mapEmbedSrc = useMemo(() => {
    if (coords) {
      return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=13&output=embed`;
    }
    // fallback pe oraș/localitate, ca “approx”
    const q = encodeURIComponent(p?.city || p?.locality || "Bucovina");
    return `https://www.google.com/maps?q=${q}&z=12&output=embed`;
  }, [coords, p]);

  const host = p?.hostId && typeof p.hostId === "object" ? p.hostId : null;
  const hostName = host?.name || "Gazda";
  const hostPhone = host?.phone || "";

  const hasPhone = typeof hostPhone === "string" && hostPhone.trim().length > 0;
  const cleanPhone = (s) => String(s || "").replace(/[^\d+]/g, "");
  const telHref = hasPhone ? `tel:${cleanPhone(hostPhone)}` : "";
  const waHref = hasPhone
    ? `https://wa.me/${cleanPhone(hostPhone).replace(/^\+/, "")}`
    : "";

  const onShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiat", {
          description: "Poți distribui acum anunțul.",
        });
      }
    } catch {
      // ignore
    }
  };

  const onSave = async () => {
    if (!user) {
      toast.info("Autentificare", { description: "Autentifică-te ca să salvezi la favorite." });
      return;
    }
  
    try {
      await toggleFav(String(id));
      // toasturile sunt deja în favoritesService (add/remove)
    } catch (e) {
      toast.error("Eroare", { description: e?.message || "Nu am putut actualiza favoritele." });
    }
  };

  async function handleSendMessage({ propertyId, message }) {
    await sendHostMessage({
      propertyId,
      message,
      // dacă guest nu e logat:
      // guestName: "Ion",
      // guestEmail: "ion@email.com",
    });
    toast.success("Mesaj trimis");
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
            <h2>Nu am putut încărca anunțul</h2>
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
                      toast.info("Recenzii", {
                        description: "În curând: recenzii detaliate.",
                      })
                    }
                  >
                    {reviewsCount} recenzii
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
              <span>Distribuie</span>
            </button>
            <button
  className={`ppActionBtn ${isFav ? "isActive" : ""}`}
  onClick={onSave}
  disabled={favLoading}
  aria-pressed={isFav}
  title={isFav ? "Scoate din favorite" : "Adaugă la favorite"}
>
  <Heart size={16} fill={isFav ? "currentColor" : "none"} />
  <span>{isFav ? "Salvat" : "Salvează"}</span>
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
                aria-label="Deschide fotografii"
              >
                <img src={images[0]} alt="Foto principală" loading="eager" />
              </button>

              <div className="ppGallerySide">
                {(images.slice(1, 5).length
                  ? images.slice(1, 5)
                  : images.slice(0, 4)
                ).map((src, idx) => (
                  <button
                    key={src + idx}
                    className="ppGalleryThumb"
                    onClick={() => setShowAllPhotos(true)}
                    aria-label="Deschide fotografii"
                  >
                    <img src={src} alt={`Foto ${idx + 2}`} loading="lazy" />
                  </button>
                ))}
              </div>

              <button
                className="ppAllPhotosBtn"
                onClick={() => setShowAllPhotos(true)}
              >
                <ImagesIcon size={16} />
                Afișează toate fotografiile
              </button>
            </div>
          ) : (
            <div className="ppGalleryEmpty">
              <div className="ppGalleryEmptyInner">
                <ImagesIcon size={22} />
                <span>Nu există fotografii încă.</span>
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
                  ? `${typeLabel} în ${p?.city || "Bucovina"}`
                  : "Detalii cazare"}
              </h2>

              {quickFacts.length ? (
                <div className="ppFactsRow">
                  {quickFacts.map(({ Icon, text }) => (
                    <div className="ppFact" key={text}>
                      <Icon size={18} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Badges */}
              {Array.isArray(p?.badges) &&
              p.badges.filter(isNonEmptyString).length ? (
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

              {/* Highlights (nu inventăm date; afișăm doar dacă are sens) */}
              {canShowHighlights ? (
                <div className="ppHighlights">
                  {ratingAvg >= 4.8 && reviewsCount >= 10 ? (
                    <div className="ppHighlightItem">
                      <Trophy size={18} />
                      <div>
                        <div className="ppHighlightTitle">
                          Printre cele mai apreciate anunțuri
                        </div>
                        <div className="ppHighlightDesc">
                          Scor ridicat, bazat pe evaluări și recenzii.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {facilities.includes("spa") ? (
                    <div className="ppHighlightItem">
                      <Sparkles size={18} />
                      <div>
                        <div className="ppHighlightTitle">
                          Relaxare la locație
                        </div>
                        <div className="ppHighlightDesc">
                          Are dotări pentru confort și relaxare.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {facilities.includes("parking") ? (
                    <div className="ppHighlightItem">
                      <Car size={18} />
                      <div>
                        <div className="ppHighlightTitle">
                          Parcare disponibilă
                        </div>
                        <div className="ppHighlightDesc">
                          Ideal dacă vii cu mașina.
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="ppDivider" />

              {/* Description */}
              {isNonEmptyString(p?.description) ? (
                <>
                  <p className="ppDesc">{clampText(p.description, 420)}</p>

                  {p.description.trim().length > 420 ? (
                    <button
                      className="ppOutlineBtn"
                      onClick={() => setShowFullDescription(true)}
                    >
                      Afișează mai multe <ChevronRight size={16} />
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="ppMuted">Descrierea nu este disponibilă încă.</p>
              )}
            </div>

            {/* Amenities */}
            {facilities.length ? (
              <div className="ppSection">
                <h2 className="ppH2">Ce oferă acest loc</h2>

                <div className="ppAmenitiesGrid">
                  {displayedAmenities.map((key) => {
                    const meta = AMENITY_META[key];
                    if (!meta) return null;
                    const Icon = meta.Icon;
                    return (
                      <div className="ppAmenity" key={key}>
                        <Icon size={20} />
                        <span>{meta.label}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  className="ppOutlineBtn"
                  onClick={() => setShowAllAmenities(true)}
                >
                  Afișează toate dotările{" "}
                  {facilities.length ? `(${facilities.length})` : ""}{" "}
                </button>

                {remainingAmenitiesCount > 0 ? (
                  <div className="ppTinyHint">
                    + încă {remainingAmenitiesCount} dotări
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Reviews (summary only, fără inventat) */}
            <div className="ppSection">
              <h2 className="ppH2">Recenzii</h2>

              {reviewsCount > 0 && ratingAvg > 0 ? (
                <div className="ppReviewSummary">
                  <div className="ppReviewScore">
                    <div className="ppBigScore">
                      <span className="ppScoreLaurel">🏆</span>
                      <span>{ratingAvg.toFixed(1).replace(".", ",")}</span>
                      <span className="ppScoreLaurel">🏆</span>
                    </div>
                    <div className="ppMuted">
                      Bazat pe {reviewsCount} recenzii
                    </div>
                  </div>

                  <div className="ppReviewNote">
                    <ShieldCheck size={18} />
                    <div>
                      <div className="ppHighlightTitle">
                        Recenzii verificate
                      </div>
                      <div className="ppHighlightDesc">
                        
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ppEmptyBlock">
                  <div className="ppEmptyTitle">Încă nu există recenzii</div>
                  <div className="ppMuted">
                    Cazarea e nouă sau nu a primit încă feedback. Poți verifica
                    dotările și locația.
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            {isNonEmptyString(p?.city) || coords ? (
              <div className="ppSection">
                <h2 className="ppH2">Unde vei fi</h2>
                {isNonEmptyString(locationLine) ? (
                  <div className="ppMuted">{locationLine}</div>
                ) : null}

                <div className="ppMapWrap">
                  <iframe
                    title="Harta"
                    src={mapEmbedSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {!coords ? (
                    <div className="ppMapOverlayNote">
                      Locație aproximativă (fără coordonate exacte)
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT (booking card) */}
          {/* RIGHT (contact card) */}
          {/* RIGHT (contact card) */}
          <div className="ppColRight">
            <div className="ppBookingCard">
              <div className="ppBookingTop">
                {typeof price === "number" && price > 0 ? (
                  <div className="ppPriceRow">
                    <span className="ppPrice">
                      {formatMoney(price, currency)}
                    </span>
                    <span className="ppMuted">/ noapte</span>
                  </div>
                ) : (
                  <div className="ppMuted">Preț indisponibil</div>
                )}

                {canShowHighlights ? (
                  <div className="ppBookingRating">
                    <Star size={14} />
                    <b>{ratingAvg.toFixed(1).replace(".", ",")}</b>
                    <span className="ppDot">•</span>
                    <span className="ppMuted">{reviewsCount} recenzii</span>
                  </div>
                ) : null}
              </div>

              <div className="ppContactBlock">
                <div className="ppContactTitle">Contactează gazda</div>
                <div className="ppContactSubtitle">
                  {hostName} • răspuns rapid • confirmă detalii înainte să vii
                </div>

                <div className="ppContactButtons">
                  {hasPhone ? (
                    <a
                      className="ppPrimaryBtn ppPrimaryBtnSolid"
                      href={telHref}
                    >
                      Sună acum
                    </a>
                  ) : (
                    <button
                      className="ppPrimaryBtn ppPrimaryBtnSolid"
                      onClick={() =>
                        toast.info("Număr indisponibil", {
                          description:
                            "Gazda nu a setat încă un număr de telefon.",
                        })
                      }
                    >
                      Sună acum
                    </button>
                  )}

                  <button
                    className="ppOutlineBtn ppOutlineBtnFull"
                    onClick={() =>
                      toast.message("Mesaj către gazdă", {
                        description: "În curând: formular / chat în platformă.",
                      })
                    }
                  >
                    Trimite mesaj
                  </button>

                  
                </div>

                <div className="ppContactHint">
                  <ShieldCheck size={16} />
                  <span>
                    Sfat: confirmă prețul, accesul și check-in-ul. (În curând:
                    mesagerie în platformă)
                  </span>
                </div>
              </div>

              <div className="ppBookingDivider" />

              <div className="ppMiniRecap">
                {typeof price === "number" && price > 0 ? (
                  <div className="ppMiniRow">
                    <span>{formatMoney(price, currency)} • noapte</span>
                    <b>{formatMoney(price, currency)}</b>
                  </div>
                ) : null}
                <div className="ppMiniRow">
                  <span className="ppMuted">Locație</span>
                  <b>{p?.city || p?.locality || "—"}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
        {Host ? (
  <>
    <HostSection host={host} property={p} onMessage={() => setMsgOpen(true)} />
    <MessageHostModal
      open={msgOpen}
      onClose={() => setMsgOpen(false)}
      host={Host}
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
        >
          <div className="ppPhotoModalHeader">
            <div className="ppPhotoModalTitle">Fotografii</div>
            <div className="ppMuted">{images.length} imagini</div>
          </div>

          <div className="ppPhotoGrid">
            {images.map((src, idx) => (
              <div className="ppPhotoCell" key={src + idx}>
                <img src={src} alt={`Foto ${idx + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </Modal>

        <Modal
          open={showAllAmenities}
          title="Ce oferă acest loc"
          onClose={() => setShowAllAmenities(false)}
          size="lg"
        >
          <div className="ppAmenityList">
            {facilities.map((key) => {
              const meta = AMENITY_META[key];
              if (!meta) return null;
              const Icon = meta.Icon;
              return (
                <div className="ppAmenityRow" key={key}>
                  <Icon size={20} />
                  <span>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </Modal>

        <Modal
          open={showFullDescription}
          title="Despre acest spațiu"
          onClose={() => setShowFullDescription(false)}
          size="lg"
        >
          <div className="ppFullDesc">
            {isNonEmptyString(p?.description) ? (
              <p>{p.description.trim()}</p>
            ) : (
              <p className="ppMuted">Descriere indisponibilă.</p>
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
                  <Users size={16} /> <span>Max {p.capacity} oaspeți</span>
                </div>
              ) : null}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
