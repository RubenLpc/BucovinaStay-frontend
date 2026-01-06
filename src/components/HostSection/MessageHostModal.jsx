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

  async function handleSend() {
    const text = message.trim();
    if (text.length < 10) {
      toast.error("Mesaj prea scurt", { description: "Scrie cel puțin 10 caractere." });
      return;
    }
    setSending(true);
    try {
      await onSend?.({
        hostId: host?.id,
        propertyId: property?._id || property?.id,
        message: text,
        guestName: user ? undefined : guestName.trim(),
        guestEmail: user ? undefined : guestEmail.trim(),
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

        <label className="mhLabel">Mesaj</label>
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
      />
    </div>
  </div>
) : null}

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
