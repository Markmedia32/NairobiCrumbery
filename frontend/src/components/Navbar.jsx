import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <img
            src="/images/logo.jpeg"
            alt="Nairobi Crumbery"
            className="navbar-logo-img"
          />
          <span className="navbar-brand-name">
            Nairobi <em>Crumbery</em>
          </span>
        </Link>

        <button
          className="navbar-toggle"
          aria-label="Open navigation menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`navbar-links ${menuOpen ? "navbar-links-open" : ""}`}>
          <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
          <NavLink to="/catalog" onClick={closeMenu}>Menu</NavLink>
          <NavLink to="/delivery" onClick={closeMenu}>Delivery</NavLink>
          <NavLink to="/support" onClick={closeMenu}>Support</NavLink>

          <NavLink to="/order" className="navbar-checkout" onClick={closeMenu}>
            Order now <span>→</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;