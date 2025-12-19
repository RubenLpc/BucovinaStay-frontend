import { Sparkles } from "lucide-react";
import "./AISearch.css";

export default function AISearch() {
  return (
    <div className="ai-bar">
<div className="ai-icon-wrapper">
  <Sparkles size={18} />
  <span className="ai-pulse" />
</div>

      <input
        placeholder="Describe your ideal stay…"
      />

      <button>
        Search
      </button>
    </div>
  );
}
