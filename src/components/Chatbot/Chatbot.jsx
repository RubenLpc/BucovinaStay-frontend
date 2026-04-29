import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot, Loader2, Star, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { sendChatMessage } from "../../api/chatService";
import "./Chatbot.css";

const WELCOME = "Bună! Sunt asistentul **BucovinaStay**.\n\nTe pot ajuta să găsești cazări, să afli detalii despre o proprietate, să citești recenzii sau să afli informații despre **Bucovina**.\n\nCu ce te pot ajuta?";

function renderMarkdown(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    const isEmpty = line.trim() === "";
    return isEmpty
      ? <span key={i} className="cb-br" />
      : <span key={i} className="cb-line">{parts}</span>;
  });
}

function PropertyCard({ p }) {
  return (
    <Link to={`/cazari/${p.id}`} className="cb-card" target="_blank">
      <div className="cb-card-img">
        {p.image
          ? <img src={p.image} alt={p.title} loading="lazy" />
          : <div className="cb-card-no-img"><MapPin size={18} /></div>
        }
      </div>
      <div className="cb-card-body">
        <p className="cb-card-title">{p.title}</p>
        <p className="cb-card-loc">
          <MapPin size={11} />
          {p.location}
        </p>
        <div className="cb-card-footer">
          <span className="cb-card-price">
            <strong>{p.pricePerNight} {p.currency}</strong>
            <span>/noapte</span>
          </span>
          {p.rating > 0 && (
            <span className="cb-card-rating">
              <Star size={11} />
              {p.rating}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Message({ m }) {
  const isBot = m.role === "assistant";
  return (
    <div className={`cb-msg cb-msg--${m.role}${m.error ? " cb-msg--error" : ""}`}>
      {isBot && <div className="cb-avatar"><Bot size={13} /></div>}
      <div className="cb-msg-inner">
        <div className="cb-bubble">{renderMarkdown(m.content)}</div>
        {isBot && m.properties?.length > 0 && (
          <div className="cb-cards">
            {m.properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME },
  ]);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages
        .slice(-9, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const { reply, properties } = await sendChatMessage(text, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, properties: properties || [] },
      ]);
    } catch (err) {
      const msg =
        err?.status === 429
          ? "Ai trimis prea multe mesaje. Încearcă în câteva secunde."
          : "A apărut o eroare. Încearcă din nou.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="cb-root">
      {open && (
        <div className="cb-panel">
          <div className="cb-header">
            <div className="cb-header-left">
              <Bot size={17} />
              <span>Asistent BucovinaStay</span>
            </div>
            <button className="cb-close" onClick={() => setOpen(false)} aria-label="Închide chat">
              <X size={16} />
            </button>
          </div>

          <div className="cb-messages">
            {messages.map((m, i) => <Message key={i} m={m} />)}

            {loading && (
              <div className="cb-msg cb-msg--assistant">
                <div className="cb-avatar"><Bot size={13} /></div>
                <div className="cb-msg-inner">
                  <div className="cb-bubble cb-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="cb-input-row">
            <textarea
              ref={inputRef}
              className="cb-input"
              rows={1}
              placeholder="Scrie un mesaj..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={600}
              disabled={loading}
            />
            <button
              className="cb-send"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="Trimite"
            >
              {loading ? <Loader2 size={16} className="cb-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      <button
        className={`cb-toggle${open ? " cb-toggle--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Închide chat" : "Deschide chat"}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
