import AISearch from "../AISearch/AISearch";
import heroImage from "../../assets/images/hero-bucovina.png";
import "./Hero.css";

export default function Hero({ onAISearch, aiLoading }) {
  return (
    <section className="hero">
      <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="hero-overlay" />

      <div className="hero-content">
        <div className="hero-text">
          <h1>
            Find your perfect stay
            <span> in Bucovina</span>
          </h1>

          <p>Handpicked stays in nature, guided by an intelligent travel assistant.</p>
        </div>

        {/* ✅ legătura */}
        <AISearch onSearch={onAISearch} loading={aiLoading} />
      </div>
    </section>
  );
}
