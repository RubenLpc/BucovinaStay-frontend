import { useState } from "react";
import { Sparkles } from "lucide-react";
import "./AISearch.css";

export default function AISearch({ onSearch, loading }) {
  const [value, setValue] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    onSearch?.(q);
  };

  return (
    <form className="ai-bar" onSubmit={submit}>
      <div className="ai-icon-wrapper">
        <Sparkles size={18} />
        <span className="ai-pulse" />
      </div>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe your ideal stay…"
        aria-label="AI search"
      />

      <button type="submit" disabled={loading || !value.trim()}>
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
