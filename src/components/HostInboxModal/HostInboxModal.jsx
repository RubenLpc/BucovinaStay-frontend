import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Phone, Mail, MessageSquare, CheckCircle2, Circle, ExternalLink, Send } from "lucide-react";
import "./HostInboxModal.css";

function cleanPhone(s) {
  return String(s || "").replace(/[^\d+]/g, "");
}
function waDigits(s) {
  return cleanPhone(s).replace(/^\+/, "");
}
function encode(v) {
  return encodeURIComponent(String(v || ""));
}

export default function HostInboxModal({
  open,
  msg,
  onClose,
  onMarkRead,
  onMarkUnread,
}) {
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraft("");
    setTimeout(() => taRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const m = msg || {};
  const isNew = (m.status || "new") === "new";

  const guestName =
    m.guestName || m.fromName || m.name || "Client";
  const guestEmail = m.guestEmail || "";
  const guestPhone = m.guestPhone || "";

  const propertyTitle = m.propertyId?.title || "Proprietate";
  const propertyCity = [m.propertyId?.locality, m.propertyId?.city].filter(Boolean).join(", ");
  const propertyCover = m.propertyId?.coverImage?.url || "";

  const when = m.createdAt
    ? new Date(m.createdAt).toLocaleString("ro-RO", { dateStyle: "full", timeStyle: "short" })
    : "";

  const telHref = guestPhone ? `tel:${cleanPhone(guestPhone)}` : "";
  const smsHref = guestPhone ? `sms:${cleanPhone(guestPhone)}?body=${encode(draft || "")}` : "";
  const waHref = guestPhone ? `https://wa.me/${waDigits(guestPhone)}?text=${encode(draft || "")}` : "";
  const mailHref = guestEmail ? `mailto:${guestEmail}?subject=${encode("Răspuns: " + propertyTitle)}&body=${encode(draft || "")}` : "";

  const canSend = (draft || "").trim().length >= 2;

  const headerSubtitle = useMemo(() => {
    const parts = [];
    if (propertyCity) parts.push(propertyCity);
    if (when) parts.push(when);
    return parts.join(" • ");
  }, [propertyCity, when]);

  if (!open) return null;
  async function handleReplySend() {
    if (!reply.trim()) {
      toast.error("Mesaj gol", { description: "Scrie un mesaj înainte de trimitere." });
      return;
    }
  
    try {
      setSending(true);
  
      await sendHostReply({
        messageId: msg._id,
        text: reply,
      });
  
      toast.success("Răspuns trimis", {
        description: "Clientul va primi mesajul.",
      });
  
      setReply("");        // ✅ curăță textarea
      onClose?.();         // opțional: închizi modalul
    } catch (err) {
      toast.error("Eroare", {
        description: err?.message || "Nu am putut trimite răspunsul.",
      });
    } finally {
      setSending(false);
    }
  }
  

  return (
    <div className="himOverlay" role="dialog" aria-modal="true">
      <button className="himBackdrop" onClick={onClose} aria-label="Închide" />
      <div className="himModal">
        {/* TOP */}
        <div className="himTop">
          <div className="himTopLeft">
            <div className="himKicker">Mesaj primit</div>
            <div className="himTitleRow">
              <div className="himTitle">{guestName}</div>
              {isNew ? <span className="himBadgeNew">NECITIT</span> : <span className="himBadgeRead">CITIT</span>}
            </div>
            <div className="himSub">{headerSubtitle}</div>
          </div>

          <div className="himTopRight">
            {isNew ? (
              <button className="himChip" type="button" onClick={onMarkRead}>
                <CheckCircle2 size={16} />
                Marchează citit
              </button>
            ) : (
              <button className="himChip" type="button" onClick={onMarkUnread}>
                <Circle size={16} />
                Marchează necitit
              </button>
            )}

            <button className="himClose" onClick={onClose} aria-label="Închide">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PROPERTY CARD */}
        <div className="himCard">
          <div
            className="himCover"
            style={propertyCover ? { backgroundImage: `url(${propertyCover})` } : undefined}
            aria-hidden="true"
          />
          <div className="himCardBody">
            <div className="himCardTitle">{propertyTitle}</div>
            <div className="himCardMeta">{propertyCity || "—"}</div>

            <div className="himActions">
              <a className={`himBtn ${guestPhone ? "" : "isDisabled"}`} href={telHref} onClick={(e) => !guestPhone && e.preventDefault()}>
                <Phone size={16} />
                Sună
              </a>

              <a
                className={`himBtn ${guestPhone ? "" : "isDisabled"}`}
                href={guestPhone ? `sms:${cleanPhone(guestPhone)}` : "#"}
                onClick={(e) => !guestPhone && e.preventDefault()}
              >
                <MessageSquare size={16} />
                SMS
              </a>

              <a
                className={`himBtn ${guestPhone ? "" : "isDisabled"}`}
                href={guestPhone ? `https://wa.me/${waDigits(guestPhone)}` : "#"}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => !guestPhone && e.preventDefault()}
              >
                <MessageSquare size={16} />
                WhatsApp
              </a>

              <a
                className={`himBtn ${guestEmail ? "" : "isDisabled"}`}
                href={guestEmail ? `mailto:${guestEmail}` : "#"}
                onClick={(e) => !guestEmail && e.preventDefault()}
              >
                <Mail size={16} />
                Email
              </a>

              <button
                className="himBtn himBtnGhost"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(m.message || ""));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  } catch {}
                }}
              >
                <ExternalLink size={16} />
                {copied ? "Copiat!" : "Copiază mesaj"}
              </button>
            </div>
          </div>
        </div>

        {/* MESSAGE BODY */}
        <div className="himMsg">
          <div className="himMsgLabel">Mesaj</div>
          <div className="himMsgBubble">{m.message || "—"}</div>
        </div>

        {/* REPLY */}
        <div className="himReply">
          <div className="himMsgLabel">Răspunde rapid</div>
          <textarea
            ref={taRef}
            className="himTextarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Scrie un răspuns scurt…"
            maxLength={800}
          />

          <div className="himReplyBar">
            <div className="himHint">Trimite prin canalul preferat (SMS / WhatsApp / Email).</div>

            <div className="himSendBtns">
              <a
                className={`himSend ${guestPhone && canSend ? "" : "isDisabled"}`}
                href={guestPhone && canSend ? smsHref : "#"}
                onClick={(e) => (!guestPhone || !canSend) && e.preventDefault()}
              >
                <Send size={16} />
                SMS
              </a>

              <a
                className={`himSend ${guestPhone && canSend ? "" : "isDisabled"}`}
                href={guestPhone && canSend ? waHref : "#"}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => (!guestPhone || !canSend) && e.preventDefault()}
              >
                <Send size={16} />
                WhatsApp
              </a>

              <a
                className={`himSend ${guestEmail && canSend ? "" : "isDisabled"}`}
                href={guestEmail && canSend ? mailHref : "#"}
                onClick={(e) => (!guestEmail || !canSend) && e.preventDefault()}
              >
                <Send size={16} />
                Email
              </a>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
