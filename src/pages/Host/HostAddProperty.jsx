import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Save,
  Send,
  X,
  MapPin,
  BedDouble,
  BadgePercent,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  UserCircle2,
  Home,
  Users,
} from "lucide-react";

import { useAuthStore } from "../../stores/authStore";
import { hostPropertyService } from "../../api/hostPropertyService";
import { hostProfileService } from "../../api/hostProfileService";
import HostProfileModal from "../../components/HostProfileModal/HostProfileModal";
import "leaflet/dist/leaflet.css";
import GeoPicker from "../../components/GeoPicker/GeoPicker";

import AmenityPicker from "../../components/AmenityPicker/AmenityPicker";
import { AMENITY_BY_KEY } from "../../constants/amenitiesCatalog";
import AmenitiesModal from "../../components/AmenitiesModal/AmenitiesModal";


import "./HostAddProperty.css";

const TYPES = ["pensiune", "cabana", "hotel", "apartament", "vila", "tiny_house"];



function clampNumber(val, min, max) {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function formatMoney(n, currency) {
  const v = Number(n);
  if (!Number.isFinite(v)) return `${n ?? ""} ${currency || ""}`.trim();
  try {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: currency || "RON",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${v} ${currency || "RON"}`;
  }
}

function countCompletion(form) {
  const checks = [
    form.title?.trim()?.length >= 3,
    form.description?.trim()?.length >= 20,
    form.city?.trim()?.length >= 2,
    Boolean(form.type),
    Number(form.capacity) >= 1,
    Number(form.pricePerNight) >= 0,
    (form.images?.length || 0) >= 5,
    Boolean(form.coverImage?.url || form.images?.[0]?.url),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function buildWarnings(form) {
  const w = [];
  if ((form.title?.trim()?.length || 0) < 3)
    w.push("Titlul e prea scurt (min. 3 caractere).");
  if ((form.description?.trim()?.length || 0) < 20)
    w.push("Descrierea e prea scurtă (min. 20 caractere).");
  if ((form.city?.trim()?.length || 0) < 2) w.push("Completează orașul.");
  if (Number(form.capacity) < 1) w.push("Capacitatea trebuie să fie minim 1.");
  if (Number(form.pricePerNight) < 0) w.push("Prețul nu poate fi negativ.");
  if ((form.images?.length || 0) < 5)
    w.push("Recomandat minim 5 poze (ideal 8–12).");
  if (!form.coverImage?.url && !form.images?.[0]?.url)
    w.push("Alege o poză de cover.");
  return w;
}

/** “profil complet” pentru a permite creare proprietate */
function isHostProfileComplete(profile) {
  const errors = {};
  if (!profile) return { ok: false, errors: { _global: "Profilul nu există încă." } };

  if (!profile.displayName || profile.displayName.trim().length < 2) {
    errors.displayName = "Display name (minim 2 caractere) este obligatoriu.";
  }

  // dacă vrei să fie obligatorii, lasă-le; dacă nu, comentează-le complet:
  // if (!profile.avatarUrl || !profile.avatarUrl.trim()) errors.avatarUrl = "Adaugă o poză (avatar).";
  // if (!profile.bio || profile.bio.trim().length < 50) errors.bio = "Bio este obligatoriu (minim 50 caractere).";

  const ok = Object.keys(errors).length === 0;
  return { ok, errors };
}

export default function HostAddPropertyScroll({ editId = null }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [propertyId, setPropertyId] = useState(null);

  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [amenitiesOpen, setAmenitiesOpen] = useState(false);


  // Host profile gating
  const [hostProfile, setHostProfile] = useState(null);
  const [hpLoading, setHpLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    type: "pensiune",
    city: "",
    locality: "",
    addressLine: "",
    pricePerNight: 250,
    currency: "RON",
    capacity: 2,
    facilities: [],
    images: [],
    coverImage: null,
    geo: null,
  });

  // Guard: only host/admin
  if (!user) return null;
  if (user.role !== "host" && user.role !== "admin") {
    return (
      <div className="container" style={{ padding: "2rem 0" }}>
        <h2>Acces restricționat</h2>
        <p>Pagina este disponibilă doar pentru gazde.</p>
      </div>
    );
  }

  // load host profile
  useEffect(() => {
    let alive = true;

    (async () => {
      setHpLoading(true);
      try {
        const res = await hostProfileService.getMyHostProfile();
        const hp =
          res?.hostProfile ||
          res?.profile ||
          res?.data?.hostProfile ||
          res?.data?.profile ||
          res ||
          null;

        if (!alive) return;
        setHostProfile(hp);

        const ok = hp?.displayName?.trim()?.length >= 2;
        if (!ok) setProfileOpen(true);
      } catch {
        if (!alive) return;
        setHostProfile(null);
      } finally {
        if (alive) setHpLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const hpCheck = useMemo(() => isHostProfileComplete(hostProfile), [hostProfile]);
  const hostProfileOk = hpCheck.ok;

  // load property for edit
  useEffect(() => {
    if (!editId) return;

    let alive = true;
    (async () => {
      try {
        const res = await hostPropertyService.getPropertyById(editId);
        const p = res?.property || res;
        if (!alive || !p) return;

        setPropertyId(p._id);

        setForm({
          title: p.title || "",
          subtitle: p.subtitle || "",
          description: p.description || "",
          type: p.type || "pensiune",
          city: p.city || "",
          locality: p.locality || "",
          addressLine: p.addressLine || "",
          pricePerNight: p.pricePerNight ?? 250,
          currency: p.currency || "RON",
          capacity: p.capacity ?? 2,
          facilities: Array.isArray(p.facilities) ? p.facilities : [],
          images: Array.isArray(p.images) ? p.images : [],
          coverImage: p.coverImage || p.images?.[0] || null,
          geo: p.geo || null,

        });
      } catch {
        toast.error("Nu am putut încărca proprietatea pentru edit.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [editId]);

  const completion = useMemo(() => countCompletion(form), [form]);
  const warnings = useMemo(() => buildWarnings(form), [form]);
  const allValid = warnings.length === 0;

  const toggleFacility = (key) => {
    setForm((p) => {
      const has = p.facilities.includes(key);
      return {
        ...p,
        facilities: has ? p.facilities.filter((x) => x !== key) : [...p.facilities, key],
      };
    });
  };

  const buildPayloadForBackend = () => ({
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    type: form.type,
    city: form.city.trim(),
    locality: form.locality.trim(),
    addressLine: form.addressLine.trim(),
    pricePerNight: Number(form.pricePerNight),
    currency: form.currency,
    capacity: Number(form.capacity),
    facilities: form.facilities,
    images: form.images || [],
    coverImage: form.coverImage || form.images?.[0] || null,
    geo: form.geo || null,

  });

  const ensureHostProfile = () => {
    if (hpLoading) {
      toast.info("Se verifică profilul gazdei…");
      return false;
    }
    if (!hostProfileOk) {
      toast.error("Completează profilul de gazdă înainte", {
        description: "Adaugă cel puțin un nume de afișare (Display name).",
      });
      navigate("/host/profile", { replace: false });
      return false;
    }
    return true;
  };

  // ---------- Save draft ----------
  const saveDraft = async (opts = { silent: false }) => {
    if (!ensureHostProfile()) return null;

    const canSave =
      form.title.trim().length >= 3 &&
      form.description.trim().length >= 20 &&
      form.city.trim().length >= 2;

    if (!canSave) {
      if (!opts.silent) {
        toast.error("Completează câmpurile obligatorii", {
          description: "Titlu (min 3), descriere (min 20), oraș (min 2).",
        });
      }
      return null;
    }

    setSaving(true);
    try {
      const payload = buildPayloadForBackend();

      if (!propertyId) {
        const data = await hostPropertyService.createDraft(payload);
        const id = data?._id || data?.id;
        setPropertyId(id);
        if (!opts.silent) toast.success("Draft creat");
        return id;
      } else {
        await hostPropertyService.updateDraft(propertyId, payload);
        if (!opts.silent) toast.success("Draft salvat");
        return propertyId;
      }
    } catch {
      if (!opts.silent) toast.error("Nu am putut salva draft-ul.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ---------- Auto-save (debounced) ----------
  const autosaveTimer = useRef(null);
  const scheduleAutosave = () => {
    if (!propertyId) return; // autosave doar după ce există draft
    if (uploading || submitting) return;

    window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      saveDraft({ silent: true });
    }, 650);
  };

  const setField = (patch) => {
    setForm((p) => {
      const next = { ...p, ...patch };
      return next;
    });
    scheduleAutosave();
  };

  // ---------- Cloudinary signed upload ----------
  const uploadToCloudinary = async (file) => {
    const sig = await hostPropertyService.getCloudinarySignature();
    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", sig.timestamp);
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);

    const res = await fetch(url, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Cloudinary upload failed");

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };
  };

  const onPickCover = async (e) => {
    if (!ensureHostProfile()) {
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      setForm((p) => ({ ...p, coverImage: uploaded }));
      toast.success("Cover încărcat");
      scheduleAutosave();
    } catch (err) {
      toast.error("Nu am putut încărca cover-ul", {
        description: err?.message || "Eroare upload",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const onPickImages = async (e) => {
    if (!ensureHostProfile()) {
      e.target.value = "";
      return;
    }
    const arr = Array.from(e.target.files || []);
    if (!arr.length) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const f of arr) uploaded.push(await uploadToCloudinary(f));

      setForm((p) => {
        const nextImages = [...(p.images || []), ...uploaded];
        const nextCover = p.coverImage?.url ? p.coverImage : uploaded[0] || null;
        return { ...p, images: nextImages, coverImage: nextCover };
      });

      toast.success(`Încărcate ${arr.length} imagini`);
      scheduleAutosave();
    } catch (err) {
      toast.error("Nu am putut încărca imaginile", {
        description: err?.message || "Eroare upload",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (publicId) => {
    setForm((p) => {
      const next = (p.images || []).filter((i) => i.publicId !== publicId);
      let nextCover = p.coverImage;
      if (p.coverImage?.publicId === publicId) nextCover = next[0] || null;
      return { ...p, images: next, coverImage: nextCover };
    });
    scheduleAutosave();
  };

  const setCoverFromGallery = (publicId) => {
    setForm((p) => {
      const img = (p.images || []).find((i) => i.publicId === publicId);
      return { ...p, coverImage: img || p.coverImage };
    });
    scheduleAutosave();
  };

  const openCoverPicker = () => coverInputRef.current?.click();
  const openGalleryPicker = () => galleryInputRef.current?.click();

  const submit = async () => {
    if (!hostProfileOk) {
      toast.error("Completează profilul de gazdă înainte.");
      setProfileOpen(true);
      return;
    }
    if (!ensureHostProfile()) return;

    let id = propertyId;
    if (!id) id = await saveDraft({ silent: false });

    if (!id) {
      toast.error("Nu am un draft salvat încă.");
      return;
    }

    if (warnings.length) {
      toast.error("Mai ai câteva lucruri de completat", { description: warnings[0] });
      const el = document.querySelector("[data-ha-anchor='review']");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSubmitting(true);
    try {
      await hostPropertyService.submitForReview(id);
      toast.success("Trimis spre verificare");
      navigate("/host", { replace: true });
    } catch {
      // toast handled in service
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitNow = allValid && !submitting && !saving && !uploading;

  return (
    <div className="haSHELL">
      <div className="haCONTAINER">
        {/* Gate banner */}
        {!hpLoading && !hostProfileOk && (
          <div className="haGate">
            <div className="haGateIcon">
              <UserCircle2 size={18} />
            </div>
            <div className="haGateText">
              <div className="haGateTitle">Completează profilul de gazdă</div>
              <div className="haGateSub">
                Înainte să creezi o proprietate, ai nevoie de un HostProfile (minim Display name).
              </div>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => setProfileOpen(true)}>
              Mergi la profil
            </button>
          </div>
        )}

        {/* Header (ca ppHeader) */}
        <div className="haHeader">
          <div className="haHeaderLeft">
            <h1 className="haTitle">{editId ? "Editează proprietate" : "Adaugă proprietate"}</h1>

            <div className="haMetaRow">
              <span className={`haPill ${propertyId ? "ok" : ""}`}>
                {editId ? "Editare draft" : propertyId ? "Draft salvat" : "Draft nou"}
              </span>

              <span className="haDot">•</span>

              <span className="haMeta">
                <Sparkles size={14} /> <b>{completion}%</b> complet
              </span>

              <span className="haDot">•</span>

              <span className="haMeta">
                <ShieldCheck size={14} /> Minim 5 poze
              </span>
            </div>
          </div>

          <div className="haHeaderActions">
            <button
              className="haActionBtn"
              type="button"
              onClick={() => saveDraft({ silent: false })}
              disabled={saving || uploading || !hostProfileOk}
            >
              <Save size={16} />
              <span>{saving ? "Se salvează..." : "Salvează"}</span>
            </button>

            <button
              className="haActionBtn haActionPrimary"
              type="button"
              onClick={() => {
                const el = document.querySelector("[data-ha-anchor='review']");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              disabled={uploading}
            >
              <CheckCircle2 size={16} />
              <span>Review</span>
            </button>
          </div>
        </div>

        {/* Grid (ca ppGrid) */}
        <div className="haGRID">
          {/* LEFT */}
          <div className="haLEFT">
            {/* Quick nav (nu e stepper; e doar “jump links”) */}
            <div className="haQuickNav">
              <button className="haQuickChip" onClick={() => document.querySelector("[data-ha-anchor='details']")?.scrollIntoView({ behavior: "smooth" })}>
                <Home size={14} /> Detalii
              </button>
              <button className="haQuickChip" onClick={() => document.querySelector("[data-ha-anchor='location']")?.scrollIntoView({ behavior: "smooth" })}>
                <MapPin size={14} /> Locație
              </button>
              <button className="haQuickChip" onClick={() => document.querySelector("[data-ha-anchor='pricing']")?.scrollIntoView({ behavior: "smooth" })}>
                <BadgePercent size={14} /> Preț
              </button>
              <button className="haQuickChip" onClick={() => document.querySelector("[data-ha-anchor='photos']")?.scrollIntoView({ behavior: "smooth" })}>
                <ImageIcon size={14} /> Poze
              </button>
              <button className="haQuickChip" onClick={() => document.querySelector("[data-ha-anchor='review']")?.scrollIntoView({ behavior: "smooth" })}>
                <CheckCircle2 size={14} /> Submit
              </button>
            </div>

            {/* SECTION: Details */}
            <section className="haSection" data-ha-anchor="details">
              <div className="haSectionTop">
                <div>
                  <h2 className="haH2">Detalii</h2>
                  <div className="haMuted">Titlu, tip, descriere, capacitate</div>
                </div>
                <div className="haMiniState">
                  {form.title.trim().length >= 3 && form.description.trim().length >= 20 ? (
                    <span className="haOK"><CheckCircle2 size={16} /> OK</span>
                  ) : (
                    <span className="haBAD"><AlertTriangle size={16} /> Incomplet</span>
                  )}
                </div>
              </div>

              <div className="haFieldGrid2">
                <div className="haField">
                  <label className="haLabel">Titlu</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setField({ title: e.target.value })}
                    onBlur={() => propertyId && saveDraft({ silent: true })}
                    placeholder="Ex: Cabană premium cu spa & view"
                    maxLength={90}
                  />
                  <div className="haHelp">{form.title.trim().length}/90 • Minim 3 caractere</div>
                </div>

                <div className="haField">
                  <label className="haLabel">Subtitlu</label>
                  <input
                    className="input"
                    value={form.subtitle}
                    onChange={(e) => setField({ subtitle: e.target.value })}
                    onBlur={() => propertyId && saveDraft({ silent: true })}
                    placeholder="Ex: Sauna • Șemineu • Parcare"
                    maxLength={60}
                  />
                  <div className="haHelp">{form.subtitle.trim().length}/60</div>
                </div>
              </div>

              <div className="haFieldGrid2">
                <div className="haField">
                  <label className="haLabel">Tip</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setField({ type: e.target.value })}
                    onBlur={() => propertyId && saveDraft({ silent: true })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="haHelp">Apare ca filtru în listări</div>
                </div>

                <div className="haField">
                  <label className="haLabel">Capacitate (persoane)</label>
                  <div className="haInputWithIcon">
                    <Users size={16} className="haInputIcon" />
                    <input
                      className="input"
                      type="number"
                      value={form.capacity}
                      onChange={(e) => setField({ capacity: clampNumber(e.target.value, 1, 50) })}
                      onBlur={() => propertyId && saveDraft({ silent: true })}
                      min={1}
                      max={50}
                    />
                  </div>
                  <div className="haHelp">Minim 1 • Maxim 50</div>
                </div>
              </div>

              <div className="haField">
                <label className="haLabel">Descriere</label>
                <textarea
                  className="input haTextarea"
                  value={form.description}
                  onChange={(e) => setField({ description: e.target.value })}
                  onBlur={() => propertyId && saveDraft({ silent: true })}
                  placeholder="Primele 2–3 propoziții contează: vibe, view, spații, acces, parcare..."
                  maxLength={4000}
                />
                <div className="haHelp">{form.description.trim().length}/4000 • Minim 20 caractere</div>
              </div>

              <div className="haCallout good">
                <Sparkles size={18} />
                <div>
                  <div className="haCalloutTitle">Tip pro</div>
                  <div className="haCalloutText">Scrie începutul ca un “hook” — apare în card + preview.</div>
                </div>
              </div>
            </section>

            {/* SECTION: Location */}
            <section className="haSection" data-ha-anchor="location">
              <div className="haSectionTop">
                <div>
                  <h2 className="haH2">Locație</h2>
                  <div className="haMuted">Oraș obligatoriu, rest opțional</div>
                </div>
                <div className="haMiniState">
                  {form.city.trim().length >= 2 ? (
                    <span className="haOK"><CheckCircle2 size={16} /> OK</span>
                  ) : (
                    <span className="haBAD"><AlertTriangle size={16} /> Incomplet</span>
                  )}
                </div>
              </div>

              <div className="haCallout neutral">
                <MapPin size={18} />
                <div>
                  <div className="haCalloutTitle">Recomandare</div>
                  <div className="haCalloutText">Localitatea și adresa cresc conversia, dar nu pune detalii sensibile.</div>
                </div>
              </div>

              <div className="haFieldGrid2">
                <div className="haField">
                  <label className="haLabel">Oraș</label>
                  <input
                    className="input"
                    value={form.city}
                    onChange={(e) => setField({ city: e.target.value })}
                    onBlur={() => propertyId && saveDraft({ silent: true })}
                    placeholder="Suceava"
                  />
                  <div className="haHelp">Minim 2 caractere</div>
                </div>

                <div className="haField">
                  <label className="haLabel">Localitate (opțional)</label>
                  <input
                    className="input"
                    value={form.locality}
                    onChange={(e) => setField({ locality: e.target.value })}
                    onBlur={() => propertyId && saveDraft({ silent: true })}
                    placeholder="Voroneț"
                  />
                  <div className="haHelp">Sat / comună / zonă</div>
                </div>
              </div>

              <div className="haField">
                <label className="haLabel">Adresă (opțional)</label>
                <input
                  className="input"
                  value={form.addressLine}
                  onChange={(e) => setField({ addressLine: e.target.value })}
                  onBlur={() => propertyId && saveDraft({ silent: true })}
                  placeholder="Strada, nr"
                />
                <div className="haHelp">Doar adresă generală. Fără coduri, instrucțiuni private etc.</div>
              </div>

              <div className="haDivider" />

<div className="haSectionTitleRow">
  <div className="haH3">Pin pe hartă</div>
  <div className="haMuted">Click pe hartă sau drag marker-ul</div>
</div>

<GeoPicker
  value={form.geo}
  onChange={(geo) => {
    setField({ geo });
    // autosave va porni singur din setField()
  }}
/>

<div className="haHelp" style={{ marginTop: 10 }}>
  {form.geo?.coordinates?.length === 2
    ? `Salvat: lng ${form.geo.coordinates[0].toFixed(5)}, lat ${form.geo.coordinates[1].toFixed(5)}`
    : "Nu ai setat încă pin-ul (recomandat)."}
</div>

{form.geo ? (
  <button
    type="button"
    className="btn btn-secondary"
    onClick={() => setField({ geo: null })}
    style={{ marginTop: 10 }}
  >
    Șterge pin
  </button>
) : null}

            </section>

            {/* SECTION: Pricing + Facilities */}
            <section className="haSection" data-ha-anchor="pricing">
              <div className="haSectionTop">
                <div>
                  <h2 className="haH2">Preț & facilități</h2>
                  <div className="haMuted">Preț/noapte + dotări</div>
                </div>
                <div className="haMiniState">
                  {Number(form.pricePerNight) >= 0 && Number(form.capacity) >= 1 ? (
                    <span className="haOK"><CheckCircle2 size={16} /> OK</span>
                  ) : (
                    <span className="haBAD"><AlertTriangle size={16} /> Incomplet</span>
                  )}
                </div>
              </div>

              <div className="haFieldGrid2">
                <div className="haField">
                  <label className="haLabel">Preț / noapte</label>
                  <div className="haInputWithIcon">
                    <BadgePercent size={16} className="haInputIcon" />
                    <input
                      className="input"
                      type="number"
                      value={form.pricePerNight}
                      onChange={(e) => setField({ pricePerNight: clampNumber(e.target.value, 0, 999999) })}
                      onBlur={() => propertyId && saveDraft({ silent: true })}
                      min={0}
                    />
                  </div>
                  <div className="haHelp">Apare în listă + în viitor la rezervări</div>
                </div>

                <div className="haField">
                  <label className="haLabel">Monedă</label>
                  <select
                    className="input"
                    value={form.currency}
                    onChange={(e) => setField({ currency: e.target.value })}
                    onBlur={() => propertyId && saveDraft({ silent: true })}
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <div className="haHelp">Recomand RON pentru Bucovina</div>
                </div>
              </div>

              <div className="haPricePreview">
                <BedDouble size={18} />
                <div>
                  <div className="haMuted">Preview</div>
                  <div className="haPriceValue">{formatMoney(form.pricePerNight, form.currency)} / noapte</div>
                </div>
              </div>

              <div className="haDivider" />

              <div className="haSectionTitleRow">
                <div className="haMuted">Bifează ce e disponibil</div>
              </div>

              <div className="haField">
  <label className="haLabel">Facilități</label>

  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => setAmenitiesOpen(true)}
    >
      Alege facilități ({form.facilities.length})
    </button>

    {form.facilities.length ? (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setField({ facilities: [] })}
      >
        Șterge toate
      </button>
    ) : null}
  </div>

  <div className="haHelp">
    Recomand: bifează doar ce există cu adevărat. Facilitățile apar ca filtre publice.
  </div>

  {/* mini preview (max 6) */}
  {form.facilities.length ? (
    <div className="haPreviewChips" style={{ marginTop: 10 }}>
      {form.facilities.slice(0, 6).map((k) => (
        <span key={k} className="haTinyChip">
          {AMENITY_BY_KEY[k]?.label || k}
        </span>
      ))}
      {form.facilities.length > 6 ? (
        <span className="haTinyChip muted">+{form.facilities.length - 6}</span>
      ) : null}
    </div>
  ) : null}
</div>

<AmenitiesModal
  open={amenitiesOpen}
  value={form.facilities}
  onClose={() => setAmenitiesOpen(false)}
  onChange={(arr) => setField({ facilities: arr })}
/>




              <div className="haCallout good">
                <CheckCircle2 size={18} />
                <div>
                  <div className="haCalloutTitle">Tip pro</div>
                  <div className="haCalloutText">Wi-Fi + Parcare + Mic dejun cresc click-urile (dacă le ai, bifează).</div>
                </div>
              </div>
            </section>

            {/* SECTION: Photos */}
            <section className="haSection" data-ha-anchor="photos">
              <div className="haSectionTop">
                <div>
                  <h2 className="haH2">Poze</h2>
                  <div className="haMuted">Cover + galerie (minim 5)</div>
                </div>
                <div className="haMiniState">
                  {(form.images?.length || 0) >= 5 && (form.coverImage?.url || form.images?.[0]?.url) ? (
                    <span className="haOK"><CheckCircle2 size={16} /> OK</span>
                  ) : (
                    <span className="haBAD"><AlertTriangle size={16} /> Incomplet</span>
                  )}
                </div>
              </div>

              <div className="haPhotoLayout">
                {/* Cover */}
                <div className="haBlock">
                  <div className="haBlockHead">
                    <div>
                      <div className="haBlockTitle">Cover photo</div>
                      <div className="haMuted">Cea mai importantă poză. Recomand: fațadă / living luminos / view.</div>
                    </div>

                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={openCoverPicker}
                      disabled={uploading || hpLoading || !hostProfileOk}
                    >
                      <ImageIcon size={18} />
                      {uploading ? "Upload..." : "Încarcă cover"}
                    </button>

                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onPickCover}
                      disabled={uploading}
                      className="haHiddenInput"
                    />
                  </div>

                  <div className={`haCover ${form.coverImage?.url ? "has" : ""}`}>
                    {form.coverImage?.url ? (
                      <>
                        <img src={form.coverImage.url} alt="Cover" />
                        <div className="haCoverOverlay">
                          <span className="haCoverPill">Cover</span>
                        </div>
                      </>
                    ) : (
                      <div className="haEmpty">
                        <ImageIcon size={22} />
                        <div>
                          <div className="haEmptyTitle">Alege un cover</div>
                          <div className="haMuted">Un cover bun crește click-urile considerabil.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gallery */}
                <div className="haBlock">
                  <div className="haBlockHead">
                    <div>
                      <div className="haBlockTitle">Galerie</div>
                      <div className="haMuted">Ideal 8–12 poze: camere, baie, exterior, spații comune, view.</div>
                    </div>

                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={openGalleryPicker}
                      disabled={uploading || hpLoading || !hostProfileOk}
                    >
                      <ImageIcon size={18} />
                      {uploading ? "Upload..." : "Încarcă imagini"}
                    </button>

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onPickImages}
                      disabled={uploading}
                      className="haHiddenInput"
                    />
                  </div>

                  <div className="haPhotoStats">
                    <div className={`haStatChip ${(form.images?.length || 0) >= 5 ? "ok" : "warn"}`}>
                      {(form.images?.length || 0) >= 5 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span>{form.images?.length || 0} / 5 minim</span>
                    </div>
                    <div className="haStatChip neutral">
                      <span>Tip: 8–12 poze arată “premium”</span>
                    </div>
                  </div>

                  {(form.images?.length || 0) === 0 ? (
                    <div className="haEmpty">
                      <ImageIcon size={22} />
                      <div>
                        <div className="haEmptyTitle">Nu ai încă poze în galerie</div>
                        <div className="haMuted">Apasă “Încarcă imagini” și adaugă câteva cadre bune.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="haThumbGrid">
                      {form.images.map((img) => {
                        const isCover = form.coverImage?.publicId === img.publicId;
                        return (
                          <div className={`haThumb ${isCover ? "isCover" : ""}`} key={img.publicId}>
                            <img src={img.url} alt="" />
                            <div className="haThumbTop">{isCover ? <span className="haThumbPill">Cover</span> : null}</div>

                            <div className="haThumbActions">
                              <button
                                type="button"
                                className="haMiniBtn"
                                onClick={() => setCoverFromGallery(img.publicId)}
                                disabled={uploading}
                              >
                                Set cover
                              </button>

                              <button
                                type="button"
                                className="haMiniBtn danger"
                                onClick={() => removeImage(img.publicId)}
                                disabled={uploading}
                              >
                                <X size={14} /> Șterge
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="haCallout neutral">
                    <AlertTriangle size={18} />
                    <div>
                      <div className="haCalloutTitle">Important</div>
                      <div className="haCalloutText">Evită poze întunecate/blur. Cover-ul trebuie să fie “wow”.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA: dacă vrei, poți crea draft aici rapid */}
              {!propertyId ? (
                <div className="haBottomCta">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => saveDraft({ silent: false })}
                    disabled={saving || uploading || !hostProfileOk}
                  >
                    <Save size={18} />
                    Creează draft (ca să pornească autosave)
                  </button>
                  <div className="haMuted">După draft, modificările se salvează automat (soft).</div>
                </div>
              ) : null}
            </section>

            {/* SECTION: Review + Submit */}
            <section className="haSection" data-ha-anchor="review">
              <div className="haSectionTop">
                <div>
                  <h2 className="haH2">Review & Trimite</h2>
                  <div className="haMuted">Verifică înainte de “Pending”</div>
                </div>

                <div className={`haReviewBadge ${warnings.length ? "warn" : "ok"}`}>
                  {warnings.length ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  {warnings.length ? `${warnings.length} atenționări` : "Gata de trimis"}
                </div>
              </div>

              {warnings.length ? (
                <div className="haWarnBox">
                  <div className="haWarnTitle">
                    <AlertTriangle size={18} /> Atenționări
                  </div>
                  <ul className="haWarnList">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="haCallout good">
                  <CheckCircle2 size={18} />
                  <div>
                    <div className="haCalloutTitle">Arată bine</div>
                    <div className="haCalloutText">Poți trimite spre verificare. Dacă vrei, mai adaugă 2–3 poze.</div>
                  </div>
                </div>
              )}

              <div className="haSubmitRow">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => saveDraft({ silent: false })}
                  disabled={saving || uploading || !hostProfileOk}
                >
                  <Save size={18} />
                  {saving ? "Se salvează..." : "Salvează draft"}
                </button>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={submit}
                  disabled={!canSubmitNow}
                >
                  <Send size={18} />
                  {submitting ? "Se trimite..." : "Trimite la verificare"}
                </button>
              </div>

              <div className="haTinyHint">
                Draft → Pending → Live. Adminul aprobă înainte să apară public.
              </div>
            </section>
          </div>

          {/* RIGHT (Sticky Preview) */}
          <aside className="haRIGHT">
            <div className="haPreviewCard">
              <div className="haPreviewTop">
                <div className="haPreviewPriceRow">
                  <span className="haPreviewPrice">{formatMoney(form.pricePerNight, form.currency)}</span>
                  <span className="haMuted">/ noapte</span>
                </div>

                <div className="haPreviewSubRow">
                  <span className="haPill soft">{form.type}</span>
                  <span className="haPill soft">{form.capacity} pers.</span>
                  <span className={`haPill ${propertyId ? "ok" : ""}`}>{propertyId ? "Draft" : "Nesalvat"}</span>
                </div>
              </div>

              <div className="haPreviewImage">
                {form.coverImage?.url || form.images?.[0]?.url ? (
                  <img src={form.coverImage?.url || form.images?.[0]?.url} alt="preview" />
                ) : (
                  <div className="haPreviewEmpty">
                    <ImageIcon size={20} />
                    <span>Fără cover</span>
                  </div>
                )}
              </div>

              <div className="haPreviewBody">
                <div className="haPreviewTitle">{form.title.trim() || "Titlu proprietate"}</div>
                <div className="haPreviewLoc">
                  <MapPin size={14} />
                  <span>
                    {[form.locality?.trim(), form.city?.trim()].filter(Boolean).join(", ") || "Locație"}
                  </span>
                </div>

                {form.subtitle?.trim() ? <div className="haPreviewSubtitle">{form.subtitle.trim()}</div> : null}

                <div className="haPreviewChips">
                {form.facilities?.slice(0, 6).map((k) => {
  const a = AMENITY_BY_KEY[k];
  return (
    <span key={k} className="haTinyChip">
      {a?.label || k}
    </span>
  );
})}

                  {(form.facilities?.length || 0) > 6 ? (
                    <span className="haTinyChip muted">+{form.facilities.length - 6}</span>
                  ) : null}
                </div>

                <div className="haPreviewMeta">
                  <div className="haMiniRow">
                    <span className="haMuted">Completare</span>
                    <b>{completion}%</b>
                  </div>
                  <div className="haMiniRow">
                    <span className="haMuted">Poze</span>
                    <b>{form.images?.length || 0}</b>
                  </div>
                  <div className="haMiniRow">
                    <span className="haMuted">Upload</span>
                    <b className={uploading ? "haPulse" : ""}>{uploading ? "în curs…" : "idle"}</b>
                  </div>
                </div>

                {warnings.length ? (
                  <div className="haSideWarn">
                    <AlertTriangle size={16} />
                    <span>{warnings[0]}</span>
                  </div>
                ) : (
                  <div className="haSideOk">
                    <CheckCircle2 size={16} />
                    <span>Gata de trimis</span>
                  </div>
                )}
              </div>
            </div>

            <div className="haSideNote">
              <ShieldCheck size={18} />
              <div>
                <div className="haSideNoteTitle">Workflow</div>
                <div className="haMuted">Draft → Pending → Live. Adminul verifică înainte de publicare.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <HostProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={(payload) => {
          const hp = payload?.hostProfile || payload?.profile || payload;
          setHostProfile(hp);
        }}
      />
    </div>
  );
}
