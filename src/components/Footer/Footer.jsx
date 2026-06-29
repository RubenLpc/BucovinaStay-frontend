import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Footer.css";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p className="footer-text">
          © {new Date().getFullYear()} BucovinaStay. {t("footer.rights")}
        </p>

        <nav className="footer-links">
          <Link to="/cazari">{t("nav.stays")}</Link>
          <Link to="/trasee">{t("footer.trails")}</Link>
        </nav>
      </div>
    </footer>
  );
}
