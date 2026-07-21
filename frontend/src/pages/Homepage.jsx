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
  },
  {
    id: "midnight-crumble-roll",
    name: "Midnight Crumble Roll",
    category: "Cinnamon Rolls",
    price: 350,
    image_url: "/images/cinnamon-roll-midnight-crumble.png",
    description: "Cookies ’n’ cream cinnamon roll with a rich, indulgent crumb.",
    minimum_quantity: 4,
  },
  {
    id: "pb-crumb",
    name: "PB & Crumb",
    category: "Cinnamon Rolls",
    price: 400,
    image_url: "/images/cinnamon-roll-pb-crumb.png",
    description: "Peanut butter and chocolate chip cinnamon roll.",
    minimum_quantity: 4,
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

const CATEGORY_INFO = {
  "All Bakes": {
    title: "Something sweet for every moment.",
    text: "Handcrafted rolls, loaves and cookies—freshly baked in Nairobi.",
  },
  "Cinnamon Rolls": {
    title: "Swirled to perfection.",
    text: "Mix your favourites. Cinnamon rolls have a minimum order of 4.",
  },
  "Cake Loaves": {
    title: "Comfort in every slice.",
    text: "Beautifully baked loaves for home, gifting, meetings and celebrations.",
  },
  Cookies: {
    title: "The cookie box you deserve.",
    text: "Choose your favourites. Cookies have a minimum order of 6.",
  },
};

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

function getMinimumQuantity(product) {
  if (product.minimum_quantity) return Number(product.minimum_quantity);
  if (product.category_rule?.minimum_quantity) {
    return Number(product.category_rule.minimum_quantity);
  }

  if (product.category === "Cinnamon Rolls") return 4;
  if (product.category === "Cookies") return 6;

  return 1;
}

function Home() {
  const [products, setProducts] = useState(MENU_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All Bakes");

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

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All Bakes") return products;

    return products.filter(
      (product) => product.category === activeCategory
    );
  }, [activeCategory, products]);

  const categories = ["All Bakes", "Cinnamon Rolls", "Cake Loaves", "Cookies"];

  return (
    <>
      <Navbar />

      <main className="home-page">
        <section className="home-hero">
          <div className="hero-spark hero-spark-one">✦</div>
          <div className="hero-spark hero-spark-two">✦</div>

          <div className="hero-copy-wrap">
            <p className="section-kicker">Freshly baked in Membley, Ruiru</p>

            <h1>
              Baked with love.<br />
              <em>Made for your moments.</em>
            </h1>

            <p className="hero-description">
              Warm cinnamon rolls, tender cake loaves and irresistible cookies—
              thoughtfully baked to make ordinary days taste extraordinary.
            </p>

            <div className="hero-actions">
              <Link to="/order" className="button-primary">
                Build your order <span>→</span>
              </Link>

              <Link to="/catalog" className="button-text">
                Explore the menu <span>↓</span>
              </Link>
            </div>

            <div className="hero-trust">
              <div className="hero-trust-icons">
                <span>♥</span>
                <span>✦</span>
                <span>☺</span>
              </div>

              <p>
                <strong>Made fresh for every order</strong>
                <br />
                Collection and Nairobi delivery available.
              </p>
            </div>
          </div>

          <div className="hero-visual hero-poster-visual">
            <img
              className="hero-main-image hero-poster-image"
              src="/images/Poster.png"
              alt="Nairobi Crumbery freshly baked pastries"
            />

            <div className="hero-float-card hero-rating">
              <span>★★★★★</span>
              <strong>Freshly baked</strong>
              <small>Every order, every time.</small>
            </div>

            <div className="hero-float-card hero-delivery">
              <b>⌂</b>
              <p>
                <strong>Delivery available</strong>
                <small>Nairobi and surrounding areas</small>
              </p>
            </div>
          </div>
        </section>

        <section className="home-ticker">
          <span>WARM ROLLS</span><b>✦</b>
          <span>FRESH LOAVES</span><b>✦</b>
          <span>IRRESISTIBLE COOKIES</span><b>✦</b>
          <span>BAKED WITH LOVE</span>
        </section>

        <section className="featured-section">
          <div className="section-header">
            <div>
              <p className="section-kicker">Our menu</p>
              <h2>{CATEGORY_INFO[activeCategory].title}</h2>
              <p className="section-description">
                {CATEGORY_INFO[activeCategory].text}
              </p>
            </div>

            <Link to="/catalog" className="outline-button">
              View full menu <span>↗</span>
            </Link>
          </div>

          <div className="category-tabs">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={
                  activeCategory === category
                    ? "category-tab active"
                    : "category-tab"
                }
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="menu-loading">
              Loading your freshly baked favourites…
            </p>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product, index) => {
                const minimum = getMinimumQuantity(product);

                return (
                  <article className="product-card" key={product.id}>
                    <div className={`product-image product-tone-${index % 3}`}>
                      <span className="product-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="product-category">
                        {product.category}
                      </span>

                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.src = "/images/Poster.png";
                        }}
                      />

                      {minimum > 1 && (
                        <span className="minimum-badge">
                          Minimum {minimum}{" "}
                          {product.category === "Cookies" ? "cookies" : "rolls"}
                        </span>
                      )}

                      <Link
                        className="product-add-button"
                        to={`/order?product=${product.id}`}
                        aria-label={`Order ${product.name}`}
                      >
                        +
                      </Link>
                    </div>

                    <div className="product-info">
                      <div>
                        <h3>{product.name}</h3>
                        <p>
                          {product.description ||
                            "Freshly baked with love."}
                        </p>
                      </div>

                      <strong>{formatPrice(product.price)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="minimum-order-section">
          <div className="minimum-order-image">
            <img
              src="/images/packaging-box.png"
              alt="Nairobi Crumbery pastry box"
            />
          </div>

          <div className="minimum-order-copy">
            <p className="section-kicker">A friendly baking note</p>

            <h2>
              More to share.<br />
              <em>More to savour.</em>
            </h2>

            <div className="minimum-rule">
              <span>04</span>
              <div>
                <h3>Cinnamon rolls</h3>
                <p>
                  Select a minimum of four rolls. Mix Nairobi Swirl, Midnight
                  Crumble Roll and PB & Crumb exactly as you like.
                </p>
              </div>
            </div>

            <div className="minimum-rule">
              <span>06</span>
              <div>
                <h3>Cookies</h3>
                <p>
                  Select a minimum of six cookies. Mix Cocoa Crush, Cloud
                  Crumble and Classic Cookie in one delicious box.
                </p>
              </div>
            </div>

            <Link to="/order" className="button-primary">
              Build a box <span>→</span>
            </Link>
          </div>
        </section>

        <section className="delivery-section">
          <div className="delivery-copy">
            <p className="section-kicker">Collection and delivery</p>

            <h2>
              Fresh from our oven,<br />
              <em>straight to your door.</em>
            </h2>

            <p>
              Order online, select delivery or collection, then confirm your
              order on WhatsApp. We deliver across Nairobi and surrounding
              areas, and collection is available from Membley, Ruiru.
            </p>

            <a
              className="button-text button-text-dark"
              href="https://wa.me/254797168003?text=Hello%20Nairobi%20Crumbery!%20I%20would%20like%20to%20ask%20about%20delivery."
              target="_blank"
              rel="noreferrer"
            >
              Ask about delivery <span>→</span>
            </a>
          </div>

          <div className="delivery-art">
            <div className="delivery-circle" />

            <img
              src="/images/delivery-rider.png"
              alt="Nairobi Crumbery delivery rider"
            />

            <div className="delivery-tag">
              DELIVERED
              <br />
              WITH CARE
            </div>
          </div>
        </section>

        <section className="steps-section">
          <div className="steps-title">
            <p className="section-kicker">Sweetness, simplified</p>

            <h2>
              Your order in<br />
              <em>three easy steps.</em>
            </h2>
          </div>

          <div className="steps-list">
            <article>
              <span>01</span>
              <b>⌘</b>
              <h3>Build your order</h3>
              <p>
                Choose the rolls, cake loaves and cookies you want, while
                observing the minimum quantities for rolls and cookies.
              </p>
            </article>

            <article>
              <span>02</span>
              <b>⌂</b>
              <h3>Select delivery or collection</h3>
              <p>
                Enter your Nairobi delivery details or arrange collection from
                Membley, Ruiru at your preferred time.
              </p>
            </article>

            <article>
              <span>03</span>
              <b>♥</b>
              <h3>Confirm via WhatsApp</h3>
              <p>
                Chat with Nairobi Crumbery to confirm availability, M-Pesa
                payment and the final delivery arrangement.
              </p>
            </article>
          </div>
        </section>

        <section className="home-cta">
          <span className="cta-star cta-star-left">✦</span>
          <span className="cta-star cta-star-right">✦</span>

          <p className="section-kicker">A little joy is waiting</p>

          <h2>
            Let’s make today<br />
            <em>a little sweeter.</em>
          </h2>

          <Link to="/order" className="button-primary button-light">
            Order your favourites <span>→</span>
          </Link>
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
    </>
  );
}

export default Home;