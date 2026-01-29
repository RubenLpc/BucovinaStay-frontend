import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./AISearch.css";

export default function AISearch({ onSearch, loading }) {
  const { t } = useTranslation();
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
        placeholder={t("ai.placeholder")}
        aria-label={t("ai.aria")}
      />

      <button type="submit" disabled={loading || !value.trim()}>
        {loading ? t("ai.searching") : t("ai.search")}
      </button>
    </form>
  );
}
