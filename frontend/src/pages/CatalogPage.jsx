import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_URL || "";

const MENU_FALLBACK = [
  {
    id: "nairobi-swirl",
    name: "Nairobi Swirl",
    category: "Cinnamon Rolls",
    price: 300,
    image_url: "/images/cinnamon-roll-nairobi-swirl.png",
    description: "Classic cinnamon roll with a warm, buttery swirl.",
    minimum_quantity: 4,
    badge: "Signature bake",
  },
  {
    id: "midnight-crumble-roll",
    name: "Midnight Crumble Roll",
    category: "Cinnamon Rolls",
    price: 350,
    image_url: "/images/cinnamon-roll-midnight-crumble.png",
    description: "Cookies ’n’ cream cinnamon roll with a rich, indulgent crumb.",
    minimum_quantity: 4,
    badge: "Customer favourite",
  },
  {
    id: "pb-crumb",
    name: "PB & Crumb",
    category: "Cinnamon Rolls",
    price: 400,
    image_url: "/images/cinnamon-roll-pb-crumb.png",
    description: "Peanut butter and chocolate chip cinnamon roll.",
    minimum_quantity: 4,
    badge: "Rich & nutty",
  },
  {
    id: "banana-bread",
    name: "Banana Bread",
    category: "Cake Loaves",
    price: 1000,
    image_url: "/images/banana-bread-loaf.png",
    description: "Moist, comforting and beautifully baked banana loaf.",
    minimum_quantity: 1,
  },
  {
    id: "marble-loaf",
    name: "Marble Loaf",
    category: "Cake Loaves",
    price: 1000,
    image_url: "/images/loaf-marble.png",
    description: "Soft vanilla and chocolate marble loaf.",
    minimum_quantity: 1,
  },
  {
    id: "french-vanilla-loaf",
    name: "French Vanilla Loaf",
    category: "Cake Loaves",
    price: 1000,
    image_url: "/images/loaf-french-vanilla.png",
    description: "Delicate vanilla flavour with a tender, rich crumb.",
    minimum_quantity: 1,
  },
  {
    id: "cinnamon-swirl-loaf",
    name: "Cinnamon Swirl Loaf",
    category: "Cake Loaves",
    price: 1300,
    image_url: "/images/loaf-cinnamon-swirl.png",
    description: "Fragrant cinnamon ribbon through every soft slice.",
    minimum_quantity: 1,
    badge: "For sharing",
  },
  {
    id: "cocoa-crush",
    name: "Cocoa Crush",
    category: "Cookies",
    price: 150,
    image_url: "/images/cookie-cocoa-crush.png",
    description: "Chocolate chip cookie with a rich cocoa finish.",
    minimum_quantity: 6,
  },
  {
    id: "cloud-crumble",
    name: "Cloud Crumble",
    category: "Cookies",
    price: 150,
    image_url: "/images/cookie-cloud-crumble.png",
    description: "White chocolate chip cookie—soft, sweet and irresistible.",
    minimum_quantity: 6,
  },
  {
    id: "classic-cookie",
    name: "Classic Cookie",
    category: "Cookies",
    price: 150,
    image_url: "/images/cookie-classic.png",
    description: "The timeless cookie, baked golden and perfectly crumbly.",
    minimum_quantity: 6,
  },
];

function formatPrice(price) {
  return `KSh ${Number(price).toLocaleString()}`;
}

function getProductImage(product) {
  const image =
    product.image_url ||
    product.image ||
    product.image_path ||
    product.imageUrl;

  if (!image) return "/images/Poster.png";
  if (image.startsWith("http") || image.startsWith("/")) return image;

  return `/images/${image}`;
}

function getMixMessage(category) {
  if (category === "Cinnamon Rolls") {
    return "Mix & match · choose any 4 rolls per order";
  }

  if (category === "Cookies") {
    return "Mix & match · choose any 6 cookies per order";
  }

  return null;
}

function CatalogPage() {
  const [products, setProducts] = useState(MENU_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All Bakes");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`${API_BASE}/api/products`);

        if (!response.ok) {
          throw new Error("Could not load products");
        }

        const databaseProducts = await response.json();

        if (Array.isArray(databaseProducts) && databaseProducts.length > 0) {
          setProducts(databaseProducts);
        }
      } catch (error) {
        console.info("Using Nairobi Crumbery menu fallback.", error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categories = ["All Bakes", "Cinnamon Rolls", "Cake Loaves", "Cookies"];

  const visibleProducts = useMemo(() => {
    let results = [...products];

    if (activeCategory !== "All Bakes") {
      results = results.filter(
        (product) => product.category === activeCategory
      );
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();

      results = results.filter((product) =>
        `${product.name} ${product.category} ${product.description || ""}`
          .toLowerCase()
          .includes(search)
      );
    }

    if (sortBy === "price-low") {
      results.sort((a, b) => Number(a.price) - Number(b.price));
    }

    if (sortBy === "price-high") {
      results.sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sortBy === "name") {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }, [products, activeCategory, searchTerm, sortBy]);

  return (
    <>
      <Navbar />

      <main className="catalog-page">
        <section className="catalog-hero">
  <div className="catalog-hero-content">
    <p className="section-kicker">The Nairobi Crumbery menu</p>

    <h1>
      Find your next
      <br />
      <em>favourite bite.</em>
    </h1>

    <p>
      Freshly baked cinnamon rolls, cake loaves and cookies—made with love,
      packed with care, and ready for your best moments.
    </p>

    <div className="catalog-hero-mini-rules">
      <span><b>04</b> Mix any rolls</span>
      <span><b>06</b> Mix any cookies</span>
      <span><b>⌂</b> Delivery available</span>
    </div>
  </div>

  <div className="catalog-hero-photo">
    <img
  src="/images/cookies-assorted.png"
  alt="Freshly baked Nairobi Crumbery cookies"
/>
  </div>
</section>

        <section className="catalog-menu-section">
          <div className="catalog-menu-heading">
            <div>
              <p className="section-kicker">Made for your cravings</p>
              <h2>
                Fresh from our <em>oven.</em>
              </h2>
            </div>

            <p className="catalog-minimum-notice">
              <span>✦</span>{" "}
              {activeCategory === "Cinnamon Rolls"
                ? "Choose any 4 rolls in total. Mix flavours freely."
                : activeCategory === "Cookies"
                  ? "Choose any 6 cookies in total. Mix flavours freely."
                  : "Rolls and cookies are available as mix-and-match boxes."}
            </p>
          </div>

          <div className="catalog-tools">
            <div className="catalog-categories">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={
                    activeCategory === category
                      ? "catalog-category active"
                      : "catalog-category"
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="catalog-controls">
              <label className="catalog-search">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Search a bake"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <label className="catalog-sort">
                <span>Sort</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Name: A–Z</option>
                </select>
              </label>
            </div>
          </div>

          {activeCategory === "Cinnamon Rolls" && (
            <section className="mix-match-guide">
              <div className="mix-match-visual">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
              </div>

              <div>
                <p className="section-kicker">Build your cinnamon roll box</p>
                <h3>
                  Pick any 4 rolls. <em>Mix every flavour you love.</em>
                </h3>
                <p>
                  Choose Nairobi Swirl, Midnight Crumble Roll and PB & Crumb
                  in any combination. The minimum is <strong>4 rolls in total
                  per order</strong>—not four of each flavour.
                </p>
              </div>

              <Link to="/order" className="mix-match-button">
                Build my box <span>→</span>
              </Link>
            </section>
          )}

          {activeCategory === "Cookies" && (
            <section className="mix-match-guide">
              <div className="mix-match-visual mix-match-cookies">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
              </div>

              <div>
                <p className="section-kicker">Build your cookie box</p>
                <h3>
                  Pick any 6 cookies. <em>Mix every flavour you love.</em>
                </h3>
                <p>
                  Combine Cocoa Crush, Cloud Crumble and Classic Cookie freely.
                  The minimum is <strong>6 cookies in total per order</strong>
                  —not six of each flavour.
                </p>
              </div>

              <Link to="/order" className="mix-match-button">
                Build my box <span>→</span>
              </Link>
            </section>
          )}

          <div className="catalog-result-summary">
            <p>
              Showing <strong>{visibleProducts.length}</strong>{" "}
              {visibleProducts.length === 1 ? "bake" : "bakes"}
            </p>

            <Link to="/order">
              Ready to order? <span>→</span>
            </Link>
          </div>

          {loading ? (
            <div className="catalog-loading">Preparing the menu…</div>
          ) : visibleProducts.length ? (
            <div className="catalog-product-grid">
              {visibleProducts.map((product, index) => {
                const mixMessage = getMixMessage(product.category);

                return (
                  <article className="catalog-product-card" key={product.id}>
                    <div
                      className={`catalog-product-image catalog-tone-${index % 4}`}
                    >
                      <span className="catalog-product-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {product.badge && (
                        <span className="catalog-product-badge">
                          {product.badge}
                        </span>
                      )}

                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.src = "/images/Poster.png";
                        }}
                      />

                      {mixMessage && (
                        <span className="catalog-mix-badge">
                          {mixMessage}
                        </span>
                      )}

                      <button
                        type="button"
                        className="catalog-quick-view"
                        onClick={() => setSelectedProduct(product)}
                      >
                        Quick view <span>↗</span>
                      </button>
                    </div>

                    <div className="catalog-product-content">
                      <div className="catalog-product-title">
                        <div>
                          <p>{product.category}</p>
                          <h3>{product.name}</h3>
                        </div>

                        <strong>{formatPrice(product.price)}</strong>
                      </div>

                      <p className="catalog-product-description">
                        {product.description || "Freshly baked with love."}
                      </p>

                      <div className="catalog-product-footer">
                        {mixMessage ? (
                          <span className="catalog-minimum-pill">
                            Mix flavours in one box
                          </span>
                        ) : (
                          <span className="catalog-single-pill">
                            Available individually
                          </span>
                        )}

                        <Link
                          to={`/order?product=${product.id}`}
                          className="catalog-order-button"
                        >
                          Add to order <span>+</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="catalog-empty">
              <span>⌕</span>
              <h3>No bakes found</h3>
              <p>Try another search or select a different menu category.</p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory("All Bakes");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section className="catalog-order-note">
          <div className="catalog-order-note-image">
            <img
              src="/images/packaging-box.png"
              alt="Nairobi Crumbery packaged order"
            />
          </div>

          <div className="catalog-order-note-copy">
            <p className="section-kicker">Before you check out</p>

            <h2>
              Your box, <em>your way.</em>
            </h2>

            <p>
              Select your bakes, choose delivery or collection, then confirm
              your order details and M-Pesa payment with the Nairobi Crumbery
              team on WhatsApp.
            </p>

            <div className="catalog-order-rules">
              <div>
                <b>04</b>
                <span>
                  <strong>Cinnamon Roll Box</strong>
                  Choose any 4 rolls in total—mix flavours freely.
                </span>
              </div>

              <div>
                <b>06</b>
                <span>
                  <strong>Cookie Box</strong>
                  Choose any 6 cookies in total—mix flavours freely.
                </span>
              </div>
            </div>

            <a
              className="catalog-whatsapp-button"
              href="https://wa.me/254797168003?text=Hello%20Nairobi%20Crumbery!%20I%20would%20like%20help%20building%20my%20mixed%20order."
              target="_blank"
              rel="noreferrer"
            >
              Chat about your order <span>→</span>
            </a>
          </div>
        </section>
      </main>

      <a
        className="whatsapp-chat"
        href="https://wa.me/254797168003?text=Hello%20Nairobi%20Crumbery!%20I%20would%20like%20help%20with%20my%20order."
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Nairobi Crumbery on WhatsApp"
      >
        <span className="whatsapp-chat-icon">◔</span>
        <span>
          <strong>Chat with us</strong>
          <small>WhatsApp: 0797 168 003</small>
        </span>
      </a>

      {selectedProduct && (
        <div
          className="catalog-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedProduct.name}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="catalog-modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              ×
            </button>

            <div className="catalog-modal-image">
              <img
                src={getProductImage(selectedProduct)}
                alt={selectedProduct.name}
              />
            </div>

            <div className="catalog-modal-copy">
              <p>{selectedProduct.category}</p>
              <h2>{selectedProduct.name}</h2>
              <strong>{formatPrice(selectedProduct.price)}</strong>

              <p className="catalog-modal-description">
                {selectedProduct.description || "Freshly baked with love."}
              </p>

              {selectedProduct.category === "Cinnamon Rolls" && (
                <div className="catalog-modal-minimum">
                  Build a mixed roll box: choose any 4 cinnamon rolls in total.
                  You may combine all flavours.
                </div>
              )}

              {selectedProduct.category === "Cookies" && (
                <div className="catalog-modal-minimum">
                  Build a mixed cookie box: choose any 6 cookies in total.
                  You may combine all flavours.
                </div>
              )}

              <Link
                to={`/order?product=${selectedProduct.id}`}
                className="button-primary"
                onClick={() => setSelectedProduct(null)}
              >
                Add to order <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CatalogPage;