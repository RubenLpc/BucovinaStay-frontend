import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p className="footer-text">
          © {new Date().getFullYear()} BucovinaStay. Toate drepturile rezervate.
        </p>

        <div className="footer-links">
          <a href="/about">Despre</a>
          <a href="/contact">Contact</a>
          <a href="/terms">Termeni</a>
        </div>
      </div>
    </footer>
  );
}
