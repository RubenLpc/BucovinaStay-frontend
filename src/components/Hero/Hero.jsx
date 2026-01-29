import AISearch from "../AISearch/AISearch";
import heroIllustration from "../../assets/images/hero-bucovina-illustration.png";
import { useTranslation } from "react-i18next";
import "./Hero.css";

export default function Hero({ onAISearch, aiLoading }) {
  const { t } = useTranslation();

  return (
    <section className="heroV2">
      {/* background layers */}
      <div className="heroV2Bg" aria-hidden="true">
        <div className="heroV2Blob heroV2BlobA" />
        <div className="heroV2Blob heroV2BlobB" />
        <div className="heroV2Grid" />
      </div>

      <div className="container heroV2Container">
        {/* LEFT */}
        <div className="heroV2Left">
           {/* LEFT 
          <div className="heroV2Kicker">
            <span className="heroV2Dot" />
            <span className="heroV2Brand">{t("hero.kicker") || "BucovinaStay"}</span>
            <span className="heroV2Sep" />
            <span className="heroV2KickerSub">
              {t("hero.kickerSub") || "cabins • nature • comfort"}
            </span>
          </div>*/}

          <h1 className="heroV2Title">
            {t("hero.title") || "Find your perfect stay"}
            <span className="heroV2TitleAccent">
              {" "}
              {t("hero.titleAccent") || "in Bucovina"}
            </span>
          </h1>

          <p className="heroV2Subtitle">
            {t("hero.subtitle") ||
              "Premium cabins, authentic hosts, and mountain views — book fast, travel easy."}
          </p>

          

          <div className="heroV2Search">
            <AISearch onSearch={onAISearch} loading={aiLoading} />
          </div>

          <div className="heroV2Trust">
            <div className="heroV2Avatars" aria-hidden="true">
              <span className="heroV2Avatar" />
              <span className="heroV2Avatar" />
              <span className="heroV2Avatar" />
              <span className="heroV2Avatar heroV2AvatarMore">+99</span>
            </div>

            <div className="heroV2TrustText">
              <div className="heroV2TrustLine1">
                <span className="heroV2Star" aria-hidden="true">★</span>
                <b>{t("hero.trustTitle") || "Trusted by travelers"}</b>
              </div>
              <div className="heroV2TrustLine2">
                {t("hero.trustSub") || "Real reviews • Verified hosts • Secure booking"}
              </div>
            </div>
          </div>

          <div className="heroV2MiniStats">
            <div className="heroV2MiniStat">
              <div className="heroV2MiniVal">{t("hero.stat1Val") || "120+"}</div>
              <div className="heroV2MiniLbl">{t("hero.stat1Lbl") || "Cabins & stays"}</div>
            </div>
            
            <div className="heroV2MiniStat">
              <div className="heroV2MiniVal">{t("hero.stat3Val") || "24/7"}</div>
              <div className="heroV2MiniLbl">{t("hero.stat3Lbl") || "Support"}</div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="heroV2Right">
          
            

            
              

              <div className="heroV2Art">
                <img
                  className="heroV2Illu"
                  src={heroIllustration}
                  alt={t("hero.mockAlt") || "Bucovina cabin in a hand, minimal premium render"}
                  loading="eager"
                />
{/* RIGHT 
                <div className="heroV2Chip heroV2ChipA">
                  <div className="heroV2ChipVal">{t("hero.chip1Val") || "28+"}</div>
                  <div className="heroV2ChipLbl">{t("hero.chip1Lbl") || "Premium stays"}</div>
                </div>

                <div className="heroV2Chip heroV2ChipB">
                  <div className="heroV2ChipVal">{t("hero.chip2Val") || "12K+"}</div>
                  <div className="heroV2ChipLbl">{t("hero.chip2Lbl") || "Happy guests"}</div>
                </div>

                <div className="heroV2Chip heroV2ChipC">
                  <div className="heroV2ChipVal">{t("hero.chip3Val") || "50+"}</div>
                  <div className="heroV2ChipLbl">{t("hero.chip3Lbl") || "Top hosts"}</div>
                </div>*/}
              </div>
            
          

         
        </div>
      </div>
    </section>
  );
}
