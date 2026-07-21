import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <p>
          Freshly baked Pastries.
          <span>✦</span>
          Made for Kenya’s sweetest moments
        </p>
      </div>

      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-brand-lockup">
            <img src="/images/logo.jpeg" alt="Nairobi Crumbery" />
            <span>
              Nairobi <em>Crumbery</em>
            </span>
          </Link>

          <p>
            Small-batch cinnamon rolls, cake loaves and cookies—baked with
            warmth, packed with care, and made to share.
          </p>

          <Link to="/order" className="footer-order-link">
            Start your order <span>→</span>
          </Link>
        </div>

        <div className="footer-links">
          <h4>Explore</h4>
          <Link to="/catalog">The menu</Link>
          <Link to="/order">Build an order</Link>
          <Link to="/delivery">Delivery & pickup</Link>
          <Link to="/support">Support</Link>
        </div>

        <div className="footer-contact">
          <h4>Say hello</h4>

          <p>
            <strong>Membley</strong>
            <br />
            Ruiru, Kenya
          </p>

          <a href="tel:+254797168003">0797 168 003</a>
          <a href="mailto:nairobicrumbery@gmail.com">
            nairobicrumbery@gmail.com
          </a>

          <a
            className="footer-whatsapp"
            href="https://wa.me/254797168003"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp the bakery <span>↗</span>
          </a>
        </div>
      </div>

      <div className="footer-ticket-divider" aria-hidden="true">
        {Array.from({ length: 120 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Nairobi Crumbery. All rights reserved.</p>
        <p>Baked with warmth in Nairobi <span>♥</span></p>
      </div>
    </footer>
  );
}

export default Footer;