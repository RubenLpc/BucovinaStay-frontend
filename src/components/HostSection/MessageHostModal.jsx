import React, { useEffect, useMemo, useRef, useState } from "react";
import "./MessageHostModal.css";
import { X, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../stores/authStore";


export default function MessageHostModal({ open, onClose, host, property, onSend }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef(null);

  const user = useAuthStore((s) => s.user);
const [guestName, setGuestName] = useState("");
const [guestEmail, setGuestEmail] = useState("");
const [guestPhone, setGuestPhone] = useState("");



  const defaultText = useMemo(() => {
    const title = property?.title ? ` legat de "${property.title}"` : "";
    return `Bună, ${host?.name || "gazdă"}! Aș dori mai multe detalii${title}.`;
  }, [host, property]);

  useEffect(() => {
    if (!open) return;
    setMessage(defaultText);
    setTimeout(() => ref.current?.focus(), 50);
  }, [open, defaultText]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  function formatRoPhone(input) {
    let v = String(input || "").trim();
  
    // păstrează doar cifre și + la început
    v = v.replace(/[^\d+]/g, "");
  
    // dacă are mai multe +, păstrează doar primul
    v = v.startsWith("+") ? "+" + v.slice(1).replace(/\+/g, "") : v.replace(/\+/g, "");
  
    // normalizări România:
    // 07xxxxxxxx -> +407xxxxxxxx
    if (v.startsWith("07")) v = "+4" + v; // devine +407...
    // 40xxxxxxxxx (fără +) -> +40...
    if (v.startsWith("40")) v = "+" + v;
    // 0040... -> +40...
    if (v.startsWith("0040")) v = "+40" + v.slice(4);
  
    // dacă începe cu +40, facem grupare: +40 7xx xxx xxx (max 9 cifre după 40)
    if (v.startsWith("+40")) {
      const digits = v.replace(/\D/g, "");
      // digits = 40 + rest
      const rest = digits.slice(2, 11); // max 9 după 40
      let out = "+40";
      if (rest.length > 0) out += " " + rest.slice(0, 3);
      if (rest.length > 3) out += " " + rest.slice(3, 6);
      if (rest.length > 6) out += " " + rest.slice(6, 9);
      return out.trim();
    }
  
    return v;
  }
  
  function isValidPhone(input) {
    const digits = String(input || "").replace(/\D/g, "");
    // acceptăm minim 9 cifre (mobil) / 10-11 (cu prefix). În practică: +40 + 9 cifre => 11 digits total
    return digits.length >= 9;
  }
  
  async function handleSend() {
    const text = message.trim();
    if (text.length < 10) {
      toast.error("Mesaj prea scurt", { description: "Scrie cel puțin 10 caractere." });
      return;
    }
  
    const isAuthed = !!user;
  
    // ✅ telefonul îl cerem DOAR la guest (neautentificat)
    const p = isAuthed ? "" : guestPhone.trim();
  
    if (!isAuthed) {
      const n = guestName.trim();
      const e = guestEmail.trim();
  
      if (n.length < 2) {
        toast.error("Nume obligatoriu", { description: "Te rog scrie numele tău." });
        return;
      }
  
      if (!e || !/^\S+@\S+\.\S+$/.test(e)) {
        toast.error("Email invalid", { description: "Te rog introdu un email valid." });
        return;
      }
  
      if (!p || !isValidPhone(p)) {
        toast.error("Telefon invalid", { description: "Completează un număr de telefon valid." });
        return;
      }
    }
  
    setSending(true);
    try {
      await onSend?.({
        hostId: host?.id,
        propertyId: property?._id || property?.id,
        message: text,
  
        // ✅ trimitem guest fields doar dacă NU e logat
        guestName: isAuthed ? undefined : guestName.trim(),
        guestEmail: isAuthed ? undefined : guestEmail.trim(),
        guestPhone: isAuthed ? undefined : guestPhone.trim(),
      });
  
      toast.success("Mesaj trimis", { description: "Gazda îl va vedea în curând." });
      onClose?.();
    } catch (err) {
      toast.error("Eroare", { description: err?.message || "Nu am putut trimite mesajul." });
    } finally {
      setSending(false);
    }
  }
  

  return (
    <div className="mhOverlay" role="dialog" aria-modal="true">
      <div className="mhBackdrop" onClick={onClose} />
      <div className="mhModal">
        <div className="mhTop">
          <div className="mhTitle">
            Trimite mesaj lui <span>{host?.name || "Gazdă"}</span>
          </div>
          <button className="mhClose" onClick={onClose} aria-label="Închide">
            <X size={18} />
          </button>
        </div>

        <div className="mhHostRow">
          <img
            className="mhAvatar"
            src={host?.avatarUrl || "https://i.pravatar.cc/120?img=12"}
            alt=""
          />
          <div className="mhMeta">
            <div className="mhName">
              {host?.name || "Gazdă"}
              {host?.isSuperHost ? (
                <span className="mhSuper">
                  <ShieldCheck size={16} />
                  Super-gazdă
                </span>
              ) : null}
            </div>
            <div className="mhSub">
              {property?.title ? <>Proprietate: <b>{property.title}</b></> : "—"}
            </div>
          </div>
        </div>
        <div>
      <label className="mhLabel">
        Telefon <span className="mhReq">*</span>
      </label>
      <input
        className="mhInput"
        value={guestPhone}
        onChange={(e) => setGuestPhone(formatRoPhone(e.target.value))}
        placeholder="+40 7xx xxx xxx"
        maxLength={24}
        inputMode="tel"
      />
    </div>

        {!user ? (
  <div className="mhGuestGrid">
    <div>
      <label className="mhLabel">Nume</label>
      <input
        className="mhInput"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="Numele tău"
        maxLength={80}
      />
    </div>

    <div>
      <label className="mhLabel">Email</label>
      <input
        className="mhInput"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        placeholder="email@exemplu.com"
        maxLength={120}
        inputMode="email"
      />
    </div>

    
  </div>
) : null}


<label className="mhLabel">Mesaj</label>

        <textarea
          ref={ref}
          className="mhTextarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1200}
          placeholder="Scrie mesajul tău..."
        />

        <div className="mhFooter">
          <div className="mhHint">Păstrează comunicarea în platformă.</div>
          <button className="mhSend" onClick={handleSend} disabled={sending}>
            <Send size={18} />
            {sending ? "Se trimite..." : "Trimite"}
          </button>
        </div>
      </div>
    </div>
  );
}
