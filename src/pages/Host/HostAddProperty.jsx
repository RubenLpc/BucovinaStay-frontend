import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Save,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  BedDouble,
  BadgePercent,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";

import { useAuthStore } from "../../stores/authStore";
import { hostPropertyService } from "../../api/hostPropertyService";
import { hostProfileService } from "../../api/hostProfileService";
import HostProfileModal from "../../components/HostProfileModal/HostProfileModal";

import "./HostAddProperty.css";

const TYPES = [
  "pensiune",
  "cabana",
  "hotel",
  "apartament",
  "vila",
  "tiny_house",
];

const FACILITIES = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "parking", label: "Parcare" },
  { key: "breakfast", label: "Mic dejun" },
  { key: "petFriendly", label: "Pet friendly" },
  { key: "spa", label: "SPA" },
  { key: "kitchen", label: "Bucătărie" },
  { key: "ac", label: "AC" },
  { key: "sauna", label: "Saună" },
  { key: "fireplace", label: "Șemineu" },
];

const STEPS = [
  { id: "details", title: "Detalii", subtitle: "Titlu, tip, descriere" },
  { id: "location", title: "Locație", subtitle: "Oraș, localitate, adresă" },
  {
    id: "pricing",
    title: "Preț & facilități",
    subtitle: "Preț/noapte, dotări",
  },
  { id: "photos", title: "Poze", subtitle: "Cover + galerie" },
  { id: "review", title: "Review", subtitle: "Verifică și trimite" },
];

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

/** ce înseamnă “profil complet” pentru a permite creare proprietate */
function isHostProfileComplete(profile) {
  const errors = {};

  if (!profile) {
    return { ok: false, errors: { _global: "Profilul nu există încă." } };
  }

  // Required by your schema: displayName
  if (!profile.displayName || profile.displayName.trim().length < 2) {
    errors.displayName = "Display name (minim 2 caractere) este obligatoriu.";
  }

  // avatarUrl is OPTIONAL in your schema -> don't block creating properties
   if (!profile.avatarUrl || !profile.avatarUrl.trim()) {
     errors.avatarUrl = "Adaugă o poză (avatar).";
   }

  // bio is OPTIONAL in your schema -> don't block
   if (!profile.bio || profile.bio.trim().length < 50) {
     errors.bio = "Bio este obligatoriu (minim 50 caractere).";
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, errors };
}


export default function HostAddProperty({ editId = null }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState(0);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [propertyId, setPropertyId] = useState(null);

  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

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

  // load host profile (required before creating properties)
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

setHostProfile(hp);


        if (!alive) return;
        setHostProfile(hp);

        const ok = hp?.displayName?.trim()?.length >= 2;
        if (!ok) setProfileOpen(true);
      } catch (e) {
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
  const hostProfileErrors = hpCheck.errors;
  
  useEffect(() => {
    if (!editId) return;

    let alive = true;
    (async () => {
      try {
        const res = await hostPropertyService.getPropertyById(editId);
        const p = res?.property || res; // depinde ce returnezi din backend

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
        });
      } catch (e) {
        toast.error("Nu am putut încărca proprietatea pentru edit.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [editId]);

  const completion = useMemo(() => countCompletion(form), [form]);

  const stepValid = useMemo(() => {
    if (step === 0)
      return (
        form.title.trim().length >= 3 && form.description.trim().length >= 20
      );
    if (step === 1) return form.city.trim().length >= 2;
    if (step === 2)
      return Number(form.pricePerNight) >= 0 && Number(form.capacity) >= 1;
    if (step === 3) {
      const hasCover = Boolean(form.coverImage?.url || form.images?.[0]?.url);
      const enoughPhotos = (form.images?.length || 0) >= 5;
      return hasCover && enoughPhotos;
    }
    return true;
  }, [step, form]);

  const warnings = useMemo(() => buildWarnings(form), [form]);
  const allValid = warnings.length === 0;

  const toggleFacility = (key) => {
    setForm((p) => {
      const has = p.facilities.includes(key);
      return {
        ...p,
        facilities: has
          ? p.facilities.filter((x) => x !== key)
          : [...p.facilities, key],
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

  // Save draft returns ID
  const saveDraft = async (opts = { silent: false }) => {
    if (!ensureHostProfile()) return null;

    // minimum quality for draft
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
    } catch (e) {
      return null;
    } finally {
      setSaving(false);
    }
  };

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
      toast.error("Mai ai câteva lucruri de completat", {
        description: warnings[0],
      });
      setStep(4);
      return;
    }

    setSubmitting(true);
    try {
      await hostPropertyService.submitForReview(id);
      toast.success("Trimis spre verificare");
      navigate("/host", { replace: true });
    } catch (e) {
      // toast handled in service
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Cloudinary signed upload ----------
  const uploadToCloudinary = async (file) => {
    // IMPORTANT: în multe setup-uri, semnătura e aceeași pentru cover și galerie
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

    if (!res.ok)
      throw new Error(data?.error?.message || "Cloudinary upload failed");

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
      // upload serial -> mai sigur (rate limit / stabil)
      for (const f of arr) uploaded.push(await uploadToCloudinary(f));

      setForm((p) => {
        const nextImages = [...(p.images || []), ...uploaded];
        const nextCover = p.coverImage?.url
          ? p.coverImage
          : uploaded[0] || null;
        return { ...p, images: nextImages, coverImage: nextCover };
      });

      toast.success(`Încărcate ${arr.length} imagini`);
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
  };

  const setCoverFromGallery = (publicId) => {
    setForm((p) => {
      const img = (p.images || []).find((i) => i.publicId === publicId);
      return { ...p, coverImage: img || p.coverImage };
    });
  };

  const openCoverPicker = () => coverInputRef.current?.click();
  const openGalleryPicker = () => galleryInputRef.current?.click();

  const goNext = async () => {
    if (!stepValid) {
      toast.error("Completează câmpurile necesare pentru acest pas.");
      return;
    }
    if (step <= 3) await saveDraft({ silent: true });

    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const canSubmitNow = allValid && !submitting && !saving && !uploading;

  return (
    <div className="hostAddShell">
      {/* Gate banner */}
      {!hpLoading && !hostProfileOk && (
        <div className="haBanner haBannerWarn">
          <div className="haBannerIcon">
            <UserCircle2 size={18} />
          </div>
          <div className="haBannerText">
            <div className="haBannerTitle">Completează profilul de gazdă</div>
            <div className="haBannerSub">
              Înainte să creezi o proprietate, ai nevoie de un HostProfile
              (minim Display name).
            </div>
          </div>
          <button
            className="haBannerBtn"
            type="button"
            onClick={() => setProfileOpen(true)}
          >
            Mergi la profil
          </button>
        </div>
      )}

      {/* Top header */}
      <header className="hostAddTop">
        <div className="topLeft">
          <div className="titleRow">
            <h1>{editId ? "Editează proprietate" : "Adaugă proprietate"}</h1>

            <span className={`statusPill ${propertyId ? "hasId" : ""}`}>
              {editId
                ? "Editare draft"
                : propertyId
                ? "Draft salvat"
                : "Draft nou"}
            </span>
          </div>

          <p className="sub">
            Creezi un draft, adaugi poze (cover separat), apoi trimiți la
            verificare.
          </p>

          <div className="metaRow">
            <div className="metaCard">
              <div className="metaIcon">
                <Sparkles size={18} />
              </div>
              <div className="metaText">
                <div className="metaLabel">Completare</div>
                <div className="metaValue">{completion}%</div>
              </div>
              <div className="progressBar">
                <div
                  className="progressFill"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>

            <div className="metaCard">
              <div className="metaIcon">
                <ShieldCheck size={18} />
              </div>
              <div className="metaText">
                <div className="metaLabel">Reguli</div>
                <div className="metaValue">Min. 5 poze</div>
              </div>
              <div className="metaHint">Ideal 8–12, cover clar & luminos.</div>
            </div>
          </div>
        </div>

        <div className="topActions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => saveDraft({ silent: false })}
            disabled={saving || uploading || !hostProfileOk}
            title={
              !hostProfileOk
                ? "Completează profilul de gazdă"
                : "Salvează draft-ul"
            }
          >
            <Save size={18} />
            {saving ? "Se salvează..." : "Salvează draft"}
          </button>

          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setStep(4);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={uploading}
            title="Mergi la review"
          >
            <CheckCircle2 size={18} />
            Review
          </button>
        </div>
      </header>

      {/* Stepper */}
      <div className="stepperWrap">
        <div className="stepper">
          {STEPS.map((s, idx) => {
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <button
                key={s.id}
                type="button"
                className={`stepItem ${isActive ? "active" : ""} ${
                  isDone ? "done" : ""
                }`}
                onClick={() => setStep(idx)}
              >
                <span className="stepDot">{isDone ? "✓" : idx + 1}</span>
                <span className="stepTxt">
                  <span className="stepTitle">{s.title}</span>
                  <span className="stepSub">{s.subtitle}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content grid */}
      <div className="hostAddGrid">
        {/* LEFT MAIN */}
        <section className="panelX mainPanel">
          <div className="panelTop">
            <div className="panelTitle">
              {STEPS[step].title}
              <span className="panelBadge">
                {step + 1}/{STEPS.length}
              </span>
            </div>
            <div className="panelHint">{STEPS[step].subtitle}</div>
          </div>

          {/* Step 1 - Details */}
          {step === 0 && (
            <div className="panelBody">
              <div className="fieldGrid2">
                <div className="fieldRow">
                  <label className="label">Titlu</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Ex: Pensiune modernă cu spa"
                    maxLength={90}
                  />
                  <div className="fieldHelp">
                    {form.title.trim().length}/90 • Minim 3 caractere
                  </div>
                </div>

                <div className="fieldRow">
                  <label className="label">Subtitlu</label>
                  <input
                    className="input"
                    value={form.subtitle}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, subtitle: e.target.value }))
                    }
                    placeholder="Ex: Spa & mic dejun"
                    maxLength={60}
                  />
                  <div className="fieldHelp">
                    {form.subtitle.trim().length}/60
                  </div>
                </div>
              </div>

              <div className="fieldGrid2">
                <div className="fieldRow">
                  <label className="label">Tip</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, type: e.target.value }))
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="fieldHelp">Apare ca filtru în listări</div>
                </div>

                <div className="fieldRow">
                  <label className="label">Capacitate (persoane)</label>
                  <input
                    className="input"
                    type="number"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        capacity: clampNumber(e.target.value, 1, 50),
                      }))
                    }
                    min={1}
                    max={50}
                  />
                  <div className="fieldHelp">Minim 1 • Maxim 50</div>
                </div>
              </div>

              <div className="fieldRow">
                <label className="label">Descriere</label>
                <textarea
                  className="input textarea"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Spune clar ce primește oaspetele: camere, vibe, spații, priveliște, acces, parcare..."
                  maxLength={4000}
                />
                <div className="fieldHelp">
                  {form.description.trim().length}/4000 • Minim 20 caractere
                </div>
              </div>

              <div className="callout good">
                <Sparkles size={18} />
                <div>
                  <div className="calloutTitle">Tip pro</div>
                  <div className="calloutText">
                    Primele 2–3 propoziții contează cel mai mult (apar în card +
                    preview).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Location */}
          {step === 1 && (
            <div className="panelBody">
              <div className="callout neutral">
                <MapPin size={18} />
                <div>
                  <div className="calloutTitle">Locație</div>
                  <div className="calloutText">
                    Orașul este obligatoriu. Localitatea și adresa sunt
                    opționale, dar cresc conversia.
                  </div>
                </div>
              </div>

              <div className="fieldGrid2">
                <div className="fieldRow">
                  <label className="label">Oraș</label>
                  <input
                    className="input"
                    value={form.city}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, city: e.target.value }))
                    }
                    placeholder="Suceava"
                  />
                  <div className="fieldHelp">Minim 2 caractere</div>
                </div>

                <div className="fieldRow">
                  <label className="label">Localitate (opțional)</label>
                  <input
                    className="input"
                    value={form.locality}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, locality: e.target.value }))
                    }
                    placeholder="Voroneț"
                  />
                  <div className="fieldHelp">Sat / comună / zonă</div>
                </div>
              </div>

              <div className="fieldRow">
                <label className="label">Adresă (opțional)</label>
                <input
                  className="input"
                  value={form.addressLine}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, addressLine: e.target.value }))
                  }
                  placeholder="Strada, nr"
                />
                <div className="fieldHelp">
                  Nu afișa detalii sensibile (ex: cod ușă), doar adresă
                  generală.
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Pricing */}
          {step === 2 && (
            <div className="panelBody">
              <div className="fieldGrid2">
                <div className="fieldRow">
                  <label className="label">Preț / noapte</label>
                  <div className="inputWithIcon">
                    <BadgePercent size={18} className="inputIcon" />
                    <input
                      className="input"
                      type="number"
                      value={form.pricePerNight}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          pricePerNight: clampNumber(e.target.value, 0, 999999),
                        }))
                      }
                      min={0}
                    />
                  </div>
                  <div className="fieldHelp">
                    Apare în listă + calcul rezervare
                  </div>
                </div>

                <div className="fieldRow">
                  <label className="label">Monedă</label>
                  <select
                    className="input"
                    value={form.currency}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, currency: e.target.value }))
                    }
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <div className="fieldHelp">Recomand RON pentru Bucovina</div>
                </div>
              </div>

              <div className="pricePreview">
                <BedDouble size={18} />
                <div className="priceText">
                  <div className="priceLabel">Preview</div>
                  <div className="priceValue">
                    {formatMoney(form.pricePerNight, form.currency)} / noapte
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className="sectionTitleRow">
                <div className="sectionTitle">Facilități</div>
                <div className="sectionHint">Selectează ce ai disponibil</div>
              </div>

              <div className="chips">
                {FACILITIES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`chip ${
                      form.facilities.includes(f.key) ? "active" : ""
                    }`}
                    onClick={() => toggleFacility(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="callout good">
                <CheckCircle2 size={18} />
                <div>
                  <div className="calloutTitle">Tip pro</div>
                  <div className="calloutText">
                    Wi-Fi + Parcare + Mic dejun sunt cele mai căutate — dacă le
                    ai, merită bifate.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 - Photos */}
          {step === 3 && (
            <div className="panelBody">
              <div className="photoLayout">
                {/* Cover */}
                <div className="coverBlock">
                  <div className="blockHead">
                    <div>
                      <div className="blockTitle">Cover photo</div>
                      <div className="blockSub">
                        Poza principală (cea mai importantă). Recomand: fațada /
                        living luminos / view.
                      </div>
                    </div>

                    <div className="blockActions">
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
                        className="hiddenInput"
                      />
                    </div>
                  </div>

                  <div
                    className={`coverPreview ${
                      form.coverImage?.url ? "hasImg" : ""
                    }`}
                  >
                    {form.coverImage?.url ? (
                      <>
                        <img src={form.coverImage.url} alt="Cover" />
                        <div className="coverOverlay">
                          <span className="coverPill">Cover</span>
                        </div>
                      </>
                    ) : (
                      <div className="coverEmpty">
                        <div className="coverEmptyIcon">
                          <ImageIcon size={22} />
                        </div>
                        <div className="coverEmptyText">
                          <div className="coverEmptyTitle">Alege un cover</div>
                          <div className="coverEmptySub">
                            Un cover bun crește click-urile considerabil.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gallery */}
                <div className="galleryBlock">
                  <div className="blockHead">
                    <div>
                      <div className="blockTitle">Galerie</div>
                      <div className="blockSub">
                        Minim 5 poze (ideal 8–12). Include: camere, baie,
                        exterior, spații comune, view.
                      </div>
                    </div>

                    <div className="blockActions">
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
                        className="hiddenInput"
                      />
                    </div>
                  </div>

                  <div className="photoStats">
                    <div
                      className={`statChip ${
                        (form.images?.length || 0) >= 5 ? "ok" : "warn"
                      }`}
                    >
                      {(form.images?.length || 0) >= 5 ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      <span>{form.images?.length || 0} / 5 minim</span>
                    </div>
                    <div className="statChip neutral">
                      <span>Tip: 8–12 poze arată “premium”</span>
                    </div>
                  </div>

                  {(form.images?.length || 0) === 0 ? (
                    <div className="galleryEmpty">
                      <div className="galleryEmptyIcon">
                        <ImageIcon size={22} />
                      </div>
                      <div className="galleryEmptyText">
                        <div className="galleryEmptyTitle">
                          Nu ai încă poze în galerie
                        </div>
                        <div className="galleryEmptySub">
                          Apasă “Încarcă imagini” și adaugă câteva cadre bune.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="thumbGrid">
                      {form.images.map((img) => {
                        const isCover =
                          form.coverImage?.publicId === img.publicId;
                        return (
                          <div
                            className={`thumb ${isCover ? "isCover" : ""}`}
                            key={img.publicId}
                          >
                            <img src={img.url} alt="" />
                            <div className="thumbTop">
                              {isCover && (
                                <span className="thumbPill">Cover</span>
                              )}
                            </div>

                            <div className="thumbActions">
                              <button
                                type="button"
                                className="miniBtn"
                                onClick={() =>
                                  setCoverFromGallery(img.publicId)
                                }
                                disabled={uploading}
                              >
                                Set cover
                              </button>

                              <button
                                type="button"
                                className="miniBtn danger"
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

                  <div className="callout neutral">
                    <AlertTriangle size={18} />
                    <div>
                      <div className="calloutTitle">Important</div>
                      <div className="calloutText">
                        Evită poze întunecate/blur. Cover-ul ar trebui să fie
                        cel mai clar și “wow”.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 - Review */}
          {step === 4 && (
            <div className="panelBody">
              <div className="reviewGrid">
                <div className="reviewCard">
                  <div className="reviewHead">
                    <div className="reviewTitle">Rezumat</div>
                    <div
                      className={`reviewBadge ${
                        warnings.length ? "warn" : "ok"
                      }`}
                    >
                      {warnings.length ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {warnings.length
                        ? `${warnings.length} atenționări`
                        : "Gata de trimis"}
                    </div>
                  </div>

                  <div className="reviewRow">
                    <div className="reviewLabel">Titlu</div>
                    <div className="reviewValue">
                      {form.title?.trim() || "—"}
                    </div>
                  </div>
                  <div className="reviewRow">
                    <div className="reviewLabel">Tip</div>
                    <div className="reviewValue">{form.type}</div>
                  </div>
                  <div className="reviewRow">
                    <div className="reviewLabel">Locație</div>
                    <div className="reviewValue">
                      {[form.locality?.trim(), form.city?.trim()]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  <div className="reviewRow">
                    <div className="reviewLabel">Preț</div>
                    <div className="reviewValue">
                      {formatMoney(form.pricePerNight, form.currency)} / noapte
                    </div>
                  </div>
                  <div className="reviewRow">
                    <div className="reviewLabel">Capacitate</div>
                    <div className="reviewValue">{form.capacity} persoane</div>
                  </div>
                  <div className="reviewRow">
                    <div className="reviewLabel">Facilități</div>
                    <div className="reviewValue">
                      {form.facilities?.length
                        ? FACILITIES.filter((f) =>
                            form.facilities.includes(f.key)
                          )
                            .map((f) => f.label)
                            .join(", ")
                        : "—"}
                    </div>
                  </div>
                  <div className="reviewRow">
                    <div className="reviewLabel">Poze</div>
                    <div className="reviewValue">
                      {form.images?.length || 0} (cover:{" "}
                      {form.coverImage?.url ? "da" : "nu"})
                    </div>
                  </div>

                  <div className="reviewMedia">
                    <div className="reviewCover">
                      <div className="reviewMediaLabel">Cover preview</div>
                      <div
                        className={`reviewCoverBox ${
                          form.coverImage?.url || form.images?.[0]?.url
                            ? "has"
                            : ""
                        }`}
                      >
                        {form.coverImage?.url || form.images?.[0]?.url ? (
                          <img
                            src={form.coverImage?.url || form.images?.[0]?.url}
                            alt="Cover preview"
                          />
                        ) : (
                          <div className="reviewCoverEmpty">—</div>
                        )}
                      </div>
                    </div>

                    <div className="reviewDesc">
                      <div className="reviewMediaLabel">Descriere</div>
                      <div className="reviewDescBox">
                        {form.description?.trim()
                          ? form.description.trim()
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="reviewCard">
                  <div className="reviewHead">
                    <div className="reviewTitle">Checklist</div>
                    <div className="reviewMini">{completion}% complet</div>
                  </div>

                  <ul className="checkList">
                    <li
                      className={form.title.trim().length >= 3 ? "ok" : "bad"}
                    >
                      {form.title.trim().length >= 3 ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      Titlu (min 3)
                    </li>
                    <li
                      className={
                        form.description.trim().length >= 20 ? "ok" : "bad"
                      }
                    >
                      {form.description.trim().length >= 20 ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      Descriere (min 20)
                    </li>
                    <li className={form.city.trim().length >= 2 ? "ok" : "bad"}>
                      {form.city.trim().length >= 2 ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      Oraș (obligatoriu)
                    </li>
                    <li
                      className={(form.images?.length || 0) >= 5 ? "ok" : "bad"}
                    >
                      {(form.images?.length || 0) >= 5 ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      Minim 5 poze
                    </li>
                    <li
                      className={
                        form.coverImage?.url || form.images?.[0]?.url
                          ? "ok"
                          : "bad"
                      }
                    >
                      {form.coverImage?.url || form.images?.[0]?.url ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      Cover setat
                    </li>
                  </ul>

                  {warnings.length ? (
                    <div className="warnBox">
                      <div className="warnTitle">
                        <AlertTriangle size={18} /> Atenționări
                      </div>
                      <ul className="warnList">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>

                      <div className="warnActions">
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => setStep(0)}
                        >
                          Repară detalii
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => setStep(3)}
                        >
                          Repară poze
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="callout good">
                      <CheckCircle2 size={18} />
                      <div>
                        <div className="calloutTitle">Arată bine</div>
                        <div className="calloutText">
                          Poți trimite spre verificare. Dacă vrei, mai adaugă
                          2–3 poze extra.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="panelX sidePanel">
          <div className="panelTop">
            <div className="panelTitle">Preview</div>
            <div className="panelHint">Cum poate arăta în listă</div>
          </div>

          <div className="previewCard">
            <div className="previewImage">
              {form.coverImage?.url || form.images?.[0]?.url ? (
                <img
                  src={form.coverImage?.url || form.images?.[0]?.url}
                  alt="preview"
                />
              ) : (
                <div className="previewEmpty">
                  <ImageIcon size={20} />
                  <span>Fără cover</span>
                </div>
              )}
              <div className="previewOverlay">
                <span className="previewPill">{form.type}</span>
                <span className="previewPill soft">{form.capacity} pers.</span>
              </div>
            </div>

            <div className="previewBody">
              <div className="previewTitle">
                {form.title.trim() || "Titlu proprietate"}
              </div>
              <div className="previewSub">
                {[form.locality?.trim(), form.city?.trim()]
                  .filter(Boolean)
                  .join(", ") || "Locație"}
              </div>

              <div className="previewPrice">
                {formatMoney(form.pricePerNight, form.currency)}{" "}
                <span>/ noapte</span>
              </div>

              <div className="previewChips">
                {form.facilities?.slice(0, 4).map((k) => {
                  const f = FACILITIES.find((x) => x.key === k);
                  return (
                    <span key={k} className="tinyChip">
                      {f?.label || k}
                    </span>
                  );
                })}
                {(form.facilities?.length || 0) > 4 && (
                  <span className="tinyChip muted">
                    +{form.facilities.length - 4}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="sideMini">
            <div className="sideMiniRow">
              <div className="miniKey">ID draft</div>
              <div className="miniVal">{propertyId || "—"}</div>
            </div>
            <div className="sideMiniRow">
              <div className="miniKey">Upload</div>
              <div className={`miniVal ${uploading ? "pulse" : ""}`}>
                {uploading ? "în curs…" : "idle"}
              </div>
            </div>
            <div className="sideMiniRow">
              <div className="miniKey">Salvare</div>
              <div className={`miniVal ${saving ? "pulse" : ""}`}>
                {saving ? "în curs…" : "idle"}
              </div>
            </div>
            <div className="sideMiniRow">
              <div className="miniKey">Gazdă</div>
              <div className={`miniVal ${hostProfileOk ? "" : "bad"}`}>
                {hpLoading
                  ? "se verifică…"
                  : hostProfileOk
                  ? "profil OK"
                  : "profil incomplet"}
              </div>
            </div>
          </div>

          <div className="callout neutral">
            <ShieldCheck size={18} />
            <div>
              <div className="calloutTitle">Workflow</div>
              <div className="calloutText">
                Draft → Pending → Live. Adminul aprobă înainte să apară public.
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky bottom bar */}
      <div className="stickyBar">
        <div className="stickyInner">
          <div className="stickyLeft">
            <div className={`stickyState ${stepValid ? "ok" : "bad"}`}>
              {stepValid ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              {stepValid ? "Pas valid" : "Completează pasul"}
            </div>
            <div className="stickyMeta">
              <span className="stickyDot" />
              <span>{completion}% complet</span>
              <span className="stickyDot" />
              <span>{form.images?.length || 0} poze</span>
            </div>
          </div>

          <div className="stickyRight">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={goBack}
              disabled={step === 0}
            >
              <ChevronLeft size={18} /> Înapoi
            </button>

            {step < 4 ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={goNext}
                disabled={uploading || saving}
              >
                Următorul <ChevronRight size={18} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                onClick={submit}
                disabled={!canSubmitNow}
              >
                <Send size={18} />
                {submitting ? "Se trimite..." : "Trimite la verificare"}
              </button>
            )}
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
    </div>
  );
}
