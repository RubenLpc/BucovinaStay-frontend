import React from "react";
import { Target } from "lucide-react";
import "./SiteJourney.css";

export default function RoadmapWhite() {
  return (
    <section className="rmw-section">
      <div className="container rmw-container">
        <header className="rmw-head">
          <h2 className="rmw-title">
            <span className="rmw-strong">Roadmap</span>{" "}
            <span className="rmw-soft">Infographics</span>
          </h2>
        </header>

        <div className="rmw-grid">
          {/* LEFT TEXT */}
          <aside className="rmw-left">
            <div className="rmw-kicker">Add Your Text Here</div>
            <p className="rmw-par">
              Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor.
              Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor.
              Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor.
            </p>

            <div className="rmw-stats">
              <div className="rmw-stat">
                <div className="rmw-num">160+</div>
                <div className="rmw-desc">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor
                </div>
              </div>

              <div className="rmw-stat">
                <div className="rmw-num">50+</div>
                <div className="rmw-desc">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT SVG */}
          <div className="rmw-right" aria-hidden="true">
            <svg className="rmw-svg" viewBox="0 0 940 520" preserveAspectRatio="none">
              <defs>
                {/* main ribbon gradient */}
                <linearGradient id="rmwGrad" x1="0.18" y1="0" x2="0.82" y2="1">
                  <stop offset="0%" stopColor="#ff6a86" />
                  <stop offset="55%" stopColor="#b455f7" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>

                {/* underside shading for 3D */}
                <linearGradient id="rmwShade" x1="0.2" y1="0" x2="0.85" y2="1">
                  <stop offset="0%" stopColor="rgba(17,24,39,0.16)" />
                  <stop offset="55%" stopColor="rgba(17,24,39,0.12)" />
                  <stop offset="100%" stopColor="rgba(17,24,39,0.18)" />
                </linearGradient>

                {/* glossy highlight */}
                <linearGradient id="rmwGloss" x1="0.18" y1="0" x2="0.82" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.68)" />
                  <stop offset="55%" stopColor="rgba(255,255,255,0.26)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
                </linearGradient>

                {/* realistic soft shadow */}
                <filter id="rmwShadow" x="-25%" y="-25%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="24" stdDeviation="18" floodColor="#111827" floodOpacity="0.14" />
                </filter>

                {/* little edge softening */}
                <filter id="rmwEdge" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="0.35" />
                </filter>
              </defs>

              {/* ====== Ribbon path (matches the template style) ====== */}
              {/* Underside (thickness illusion) */}
              <path
                d="M 140 120
                   C 300 40, 440 70, 600 145
                   S 820 285, 875 255
                   S 930 232, 915 308
                   S 760 448, 585 382
                   S 390 292, 270 368
                   S 165 475, 170 452"
                fill="none"
                stroke="url(#rmwShade)"
                strokeWidth="86"
                strokeLinecap="round"
                filter="url(#rmwShadow)"
                opacity="0.58"
              />

              {/* Top surface */}
              <path
                d="M 140 120
                   C 300 40, 440 70, 600 145
                   S 820 285, 875 255
                   S 930 232, 915 308
                   S 760 448, 585 382
                   S 390 292, 270 368
                   S 165 475, 170 452"
                fill="none"
                stroke="url(#rmwGrad)"
                strokeWidth="72"
                strokeLinecap="round"
                filter="url(#rmwEdge)"
              />

              {/* Gloss strip */}
              <path
                d="M 140 120
                   C 300 40, 440 70, 600 145
                   S 820 285, 875 255
                   S 930 232, 915 308
                   S 760 448, 585 382
                   S 390 292, 270 368
                   S 165 475, 170 452"
                fill="none"
                stroke="url(#rmwGloss)"
                strokeWidth="22"
                strokeLinecap="round"
                opacity="0.95"
              />

              {/* Center dashed line */}
              <path
                d="M 140 120
                   C 300 40, 440 70, 600 145
                   S 820 285, 875 255
                   S 930 232, 915 308
                   S 760 448, 585 382
                   S 390 292, 270 368
                   S 165 475, 170 452"
                fill="none"
                stroke="rgba(255,255,255,0.72)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="12 16"
                opacity="0.92"
              />
            </svg>

            {/* Marker + callout (like the screenshot) */}
            <div className="rmw-marker" style={{ left: "67%", top: "19%" }}>
              <div className="rmw-sign">
                <Target size={16} />
              </div>
              <div className="rmw-stick" />
              <div className="rmw-callout">
                <div className="rmw-callout-title">Your Text Here</div>
                <div className="rmw-callout-text">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
