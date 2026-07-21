import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_URL || "";
const SHOP_MPESA_PHONE = "0797 168 003";
const RECIPIENT_NAME = "Wambui Gatume";

const FALLBACK_PRODUCTS = [
  { id: "nairobi-swirl", name: "Nairobi Swirl", category: "Cinnamon Rolls", price: 300, image_url: "/images/cinnamon-roll-nairobi-swirl.png" },
  { id: "midnight-crumble-roll", name: "Midnight Crumble Roll", category: "Cinnamon Rolls", price: 350, image_url: "/images/cinnamon-roll-midnight-crumble.png" },
  { id: "pb-crumb", name: "PB & Crumb", category: "Cinnamon Rolls", price: 400, image_url: "/images/cinnamon-roll-pb-crumb.png" },
  { id: "banana-bread", name: "Banana Bread", category: "Cake Loaves", price: 1000, image_url: "/images/banana-bread-loaf.png" },
  { id: "marble-loaf", name: "Marble Loaf", category: "Cake Loaves", price: 1000, image_url: "/images/loaf-marble.png" },
  { id: "french-vanilla-loaf", name: "French Vanilla Loaf", category: "Cake Loaves", price: 1000, image_url: "/images/loaf-french-vanilla.png" },
  { id: "cinnamon-swirl-loaf", name: "Cinnamon Swirl Loaf", category: "Cake Loaves", price: 1300, image_url: "/images/loaf-cinnamon-swirl.png" },
  { id: "cocoa-crush", name: "Cocoa Crush", category: "Cookies", price: 150, image_url: "/images/cookie-cocoa-crush.png" },
  { id: "cloud-crumble", name: "Cloud Crumble", category: "Cookies", price: 150, image_url: "/images/cookie-cloud-crumble.png" },
  { id: "classic-cookie", name: "Classic Cookie", category: "Cookies", price: 150, image_url: "/images/cookie-classic.png" },
];

const CATEGORY_RULES = {
  "Cinnamon Rolls": { minimum: 4, label: "Minimum 4 rolls of your choice" },
  Cookies: { minimum: 6, label: "Minimum 6 cookies of your choice" },
};

function formatPrice(value) {
  return `KSh ${Number(value || 0).toLocaleString()}`;
}

function imageSource(product) {
  const image = product.image_url || product.image || product.image_path;

  if (!image) return "/images/Poster.png";
  if (image.startsWith("http") || image.startsWith("/")) return image;

  return `/images/${image}`;
}

function ScreenshotCropper({ onFileReady }) {
  const [rawFile, setRawFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [cropBottomPercent, setCropBottomPercent] = useState(20);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  function handleFileSelect(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setRawFile(file);
    setImageUrl(URL.createObjectURL(file));
  }

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();

    img.onload = () => {
      imgRef.current = img;
      drawCropped();
    };

    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    drawCropped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropBottomPercent]);

  function drawCropped() {
    const img = imgRef.current;
    const canvas = canvasRef.current;

    if (!img || !canvas) return;

    const keepHeight = Math.floor(
      img.height * (1 - cropBottomPercent / 100)
    );

    canvas.width = img.width;
    canvas.height = keepHeight;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      keepHeight,
      0,
      0,
      img.width,
      keepHeight
    );
  }

  function confirmCrop() {
    const canvas = canvasRef.current;

    if (!canvas || !rawFile) return;

    canvas.toBlob(
      (blob) => {
        const croppedFile = new File([blob], rawFile.name, {
          type: "image/jpeg",
        });

        onFileReady(croppedFile);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="screenshot-cropper">
      <input type="file" accept="image/*" onChange={handleFileSelect} />

      {imageUrl && (
        <>
          <p className="screenshot-cropper-hint">
            Drag the slider to trim off your M-Pesa balance before uploading.
          </p>

          <canvas ref={canvasRef} className="screenshot-cropper-canvas" />

          <label className="screenshot-cropper-slider">
            Trim bottom: {cropBottomPercent}%
            <input
              type="range"
              min="0"
              max="60"
              value={cropBottomPercent}
              onChange={(event) =>
                setCropBottomPercent(Number(event.target.value))
              }
            />
          </label>

          <button
            type="button"
            className="button-primary"
            onClick={confirmCrop}
          >
            Use this cropped screenshot
          </button>
        </>
      )}
    </div>
  );
}

function OrderPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [quantities, setQuantities] = useState({});
  const [appliedProduct, setAppliedProduct] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("building");
  const [orderResult, setOrderResult] = useState(null);

  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  const [mpesaCode, setMpesaCode] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    fulfillment: "delivery",
    address: "",
    landmark: "",
    preferredDate: "",
    preferredTime: "",
    notes: "",
  });

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`${API_BASE}/api/products`);

        if (!response.ok) {
          throw new Error(
            `Could not load products. Server status: ${response.status}`
          );
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      } catch (err) {
        console.info("Using Nairobi Crumbery fallback menu:", err.message);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    const productId = searchParams.get("product");

    if (productId && !appliedProduct) {
      setQuantities((current) => ({
        ...current,
        [productId]: (current[productId] || 0) + 1,
      }));

      setAppliedProduct(true);
    }
  }, [searchParams, appliedProduct]);

  useEffect(() => {
    if (form.fulfillment !== "delivery" || form.address.trim().length < 5) {
      setDeliveryEstimate(null);
      return;
    }

    setEstimating(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/delivery/estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: form.address }),
        });

        const data = await response.json();

        setDeliveryEstimate(data);
      } catch {
        setDeliveryEstimate(null);
      } finally {
        setEstimating(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [form.address, form.fulfillment]);

  const selectedItems = useMemo(() => {
    return products
      .filter((product) => quantities[product.id] > 0)
      .map((product) => ({
        ...product,
        quantity: quantities[product.id],
      }));
  }, [products, quantities]);

  const subtotal = useMemo(() => {
    return selectedItems.reduce(
      (total, item) => total + Number(item.price) * item.quantity,
      0
    );
  }, [selectedItems]);

  const previewDeliveryFee =
    form.fulfillment === "delivery" && deliveryEstimate?.estimated
      ? deliveryEstimate.fee
      : 0;

  const previewTotal = subtotal + previewDeliveryFee;

  const categoryCounts = useMemo(() => {
    return selectedItems.reduce((counts, item) => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
      return counts;
    }, {});
  }, [selectedItems]);

  const minimumIssues = useMemo(() => {
    return Object.entries(CATEGORY_RULES)
      .map(([category, rule]) => {
        const count = categoryCounts[category] || 0;

        if (count > 0 && count < rule.minimum) {
          return {
            category,
            count,
            minimum: rule.minimum,
            remaining: rule.minimum - count,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [categoryCounts]);

  function changeQuantity(productId, amount) {
    setError("");

    setQuantities((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] || 0) + amount),
    }));
  }

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function validateOrder() {
    if (!selectedItems.length) {
      return "Please add at least one bake to your order.";
    }

    if (minimumIssues.length) {
      const firstIssue = minimumIssues[0];

      return `Your ${firstIssue.category} box needs ${firstIssue.remaining} more item${firstIssue.remaining > 1 ? "s" : ""}. You may mix flavours freely.`;
    }

    if (!form.name.trim() || !form.phone.trim()) {
      return "Please enter your name and phone number.";
    }

    if (form.fulfillment === "delivery" && !form.address.trim()) {
      return "Please enter your delivery address.";
    }

    if (!form.preferredDate || !form.preferredTime) {
      return "Please select your preferred date and time.";
    }

    return null;
  }

  async function submitOrder(event) {
    event.preventDefault();

    const validationError = validateOrder();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email,
          },
          fulfillment: {
            type: form.fulfillment,
            address: form.address,
            landmark: form.landmark,
            preferredDate: form.preferredDate,
            preferredTime: form.preferredTime,
          },
          notes: form.notes,
          items: selectedItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create the order.");
      }

      setOrderResult(data);
      setStage("payment");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPayment(event) {
    event.preventDefault();

    if (!mpesaCode.trim()) {
      setPaymentError("Please enter your M-Pesa transaction code.");
      return;
    }

    setPaymentError("");
    setSubmittingPayment(true);

    try {
      const formData = new FormData();

      formData.append("phone", form.phone);
      formData.append("mpesaCode", mpesaCode);

      if (screenshotFile) {
        formData.append("screenshot", screenshotFile);
      }

      const response = await fetch(
        `${API_BASE}/api/orders/${orderResult.orderCode}/payment`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not submit payment details.");
      }

      setStage("done");
    } catch (err) {
      setPaymentError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmittingPayment(false);
    }
  }

  if (stage === "done") {
    return (
      <>
        <Navbar />

        <main className="order-page">
          <section className="order-success">
            <div className="order-success-card">
              <span className="order-success-icon">✓</span>
              <p className="section-kicker">Order details sent</p>
              <h1>
                Thank you for
                <br />
                <em>shopping with us.</em>
              </h1>

              <p>
                Nairobi Crumbery will call or message you regarding your order
                <strong className="order-reference"> {orderResult.orderCode}</strong>.
              </p>

              <p>
                You can check your order's progress anytime using your reference
                code on our <Link to="/track">Track Order</Link> page.
              </p>

              <Link to="/" className="order-home-link">
                Back to home
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  if (stage === "payment") {
    return (
      <>
        <Navbar />

        <main className="order-page">
          <section className="order-success">
            <div className="order-success-card">
              <p className="section-kicker">Order saved</p>
              <h1>
                Complete your
                <br />
                <em>payment.</em>
              </h1>

              <p>
                Order reference:
                <strong className="order-reference"> {orderResult.orderCode}</strong>
              </p>

              <div className="order-success-total">
                <span>Bakes subtotal</span>
                <strong>{formatPrice(orderResult.subtotal)}</strong>
              </div>

              {orderResult.deliveryFee > 0 && (
                <div className="order-success-total">
                  <span>
                    Delivery fee{" "}
                    {orderResult.distanceKm
                      ? `(~${orderResult.distanceKm}km)`
                      : ""}
                  </span>
                  <strong>{formatPrice(orderResult.deliveryFee)}</strong>
                </div>
              )}

              <div className="order-success-total">
                <span>Total to pay</span>
                <strong>{formatPrice(orderResult.total)}</strong>
              </div>

              <div className="order-payment-note">
                <b>01</b>
                <p>
                  Send <strong>{formatPrice(orderResult.total)}</strong> via
                  M-Pesa to <strong> {SHOP_MPESA_PHONE}</strong>. Confirm the
                  recipient name shows as <strong>{RECIPIENT_NAME}</strong>{" "}
                  before sending.
                </p>
              </div>

              <div className="order-payment-note">
                <b>02</b>
                <p>
                  Enter your M-Pesa transaction code below, and optionally
                  attach a cropped screenshot.
                </p>
              </div>

              <form onSubmit={submitPayment} className="order-payment-form">
                <label>
                  M-Pesa transaction code *
                  <input
                    value={mpesaCode}
                    onChange={(event) =>
                      setMpesaCode(event.target.value.toUpperCase())
                    }
                    placeholder="e.g. QAB1CD2EF3"
                    required
                  />
                </label>

                <label>
                  Payment screenshot <span>Optional</span>
                  <ScreenshotCropper onFileReady={setScreenshotFile} />
                  {screenshotFile && (
                    <p className="screenshot-ready-note">
                      ✓ Screenshot ready to submit
                    </p>
                  )}
                </label>

                {paymentError && (
                  <div className="order-error-message">{paymentError}</div>
                )}

                <button
                  className="order-submit-button"
                  type="submit"
                  disabled={submittingPayment}
                >
                  {submittingPayment
                    ? "Submitting…"
                    : "Submit Payment Details"}
                  <span>→</span>
                </button>
              </form>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="order-page">
        <section className="order-hero">
          <div>
            <p className="section-kicker">Your personal order studio</p>
            <h1>
              Build your
              <br />
              <em>sweetest box.</em>
            </h1>
            <p>
              Pick your bakes, mix your flavours, choose delivery or pickup,
              then pay directly with M-Pesa.
            </p>
          </div>

          <div className="order-hero-rule">
            <span>✦</span>
            <p>
              <strong>Mix & match freely</strong>
              Minimum 4 rolls of your choice.
              <br />
              Minimum 6 cookies of your choice.
            </p>
          </div>
        </section>

        <form className="order-layout" onSubmit={submitOrder}>
          <section className="order-builder">
            <div className="order-section-heading">
              <div>
                <p className="section-kicker">Step 1 of 3</p>
                <h2>
                  Choose your <em>bakes.</em>
                </h2>
              </div>

              <p>Tap + or − to build your order.</p>
            </div>

            {Object.entries(
              products.reduce((groups, product) => {
                groups[product.category] = [
                  ...(groups[product.category] || []),
                  product,
                ];

                return groups;
              }, {})
            ).map(([category, categoryProducts]) => {
              const rule = CATEGORY_RULES[category];
              const count = categoryCounts[category] || 0;
              const isReady = !rule || count >= rule.minimum;

              return (
                <section className="order-category" key={category}>
                  <div className="order-category-heading">
                    <div>
                      <p>{category}</p>
                      <h3>
                        {rule ? rule.label : "Choose as many as you like"}
                      </h3>
                    </div>

                    {rule && (
                      <div
                        className={`order-rule-progress ${
                          isReady ? "ready" : ""
                        }`}
                      >
                        <span>
                          {Math.min(count, rule.minimum)} / {rule.minimum}
                        </span>
                        <small>
                          {isReady
                            ? "Your mixed box is ready"
                            : `Add ${rule.minimum - count} more`}
                        </small>
                      </div>
                    )}
                  </div>

                  {rule && (
                    <div className="order-rule-bar">
                      {Array.from({ length: rule.minimum }).map((_, index) => (
                        <span
                          key={index}
                          className={index < count ? "filled" : ""}
                        />
                      ))}
                    </div>
                  )}

                  <div className="order-product-list">
                    {categoryProducts.map((product) => {
                      const quantity = quantities[product.id] || 0;

                      return (
                        <article className="order-product-row" key={product.id}>
                          <img
                            src={imageSource(product)}
                            alt={product.name}
                            onError={(event) => {
                              event.currentTarget.src = "/images/Poster.png";
                            }}
                          />

                          <div className="order-product-details">
                            <h4>{product.name}</h4>
                            <p>{formatPrice(product.price)} each</p>
                          </div>

                          <div className="order-quantity-control">
                            <button
                              type="button"
                              onClick={() => changeQuantity(product.id, -1)}
                              disabled={!quantity}
                              aria-label={`Remove one ${product.name}`}
                            >
                              −
                            </button>

                            <span>{quantity}</span>

                            <button
                              type="button"
                              onClick={() => changeQuantity(product.id, 1)}
                              aria-label={`Add one ${product.name}`}
                            >
                              +
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <section className="order-details-section">
              <div className="order-section-heading">
                <div>
                  <p className="section-kicker">Step 2 of 3</p>
                  <h2>
                    Your delivery <em>details.</em>
                  </h2>
                </div>
              </div>

              <div className="order-form-grid">
                <label>
                  Full name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateForm}
                    placeholder="Your full name"
                    required
                  />
                </label>

                <label>
                  WhatsApp / phone number *
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={updateForm}
                    placeholder="07XX XXX XXX"
                    required
                  />
                </label>

                <label className="order-full-field">
                  Email address <span>Optional</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateForm}
                    placeholder="For your order receipt"
                  />
                </label>
              </div>

              <div className="order-fulfillment-options">
                <label
                  className={
                    form.fulfillment === "delivery" ? "selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value="delivery"
                    checked={form.fulfillment === "delivery"}
                    onChange={updateForm}
                  />

                  <span>⌂</span>

                  <div>
                    <strong>Delivery</strong>
                    <small>
                      We calculate your delivery fee automatically based on your
                      location.
                    </small>
                  </div>
                </label>

                <label
                  className={
                    form.fulfillment === "collection" ? "selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value="collection"
                    checked={form.fulfillment === "collection"}
                    onChange={updateForm}
                  />

                  <span>⌘</span>

                  <div>
                    <strong>Pickup</strong>
                    <small>
                      Collect from our Membley, Ruiru location at a confirmed
                      time.
                    </small>
                  </div>
                </label>
              </div>

              {form.fulfillment === "delivery" && (
                <div className="order-form-grid">
                  <label className="order-full-field">
                    Delivery address *
                    <input
                      name="address"
                      value={form.address}
                      onChange={updateForm}
                      placeholder="Estate, building, road or house number"
                      required
                    />
                  </label>

                  {estimating && (
                    <p className="delivery-estimate-note">
                      Estimating delivery fee…
                    </p>
                  )}

                  {!estimating && deliveryEstimate?.estimated && (
                    <p className="delivery-estimate-note ready">
                      Estimated delivery: {formatPrice(deliveryEstimate.fee)} (
                      ~{deliveryEstimate.distanceKm}km from our bakery)
                    </p>
                  )}

                  {!estimating &&
                    deliveryEstimate &&
                    !deliveryEstimate.estimated && (
                      <p className="delivery-estimate-note">
                        {deliveryEstimate.message}
                      </p>
                    )}

                  <label className="order-full-field">
                    Landmark / delivery note <span>Optional</span>
                    <input
                      name="landmark"
                      value={form.landmark}
                      onChange={updateForm}
                      placeholder="Nearby landmark or useful directions"
                    />
                  </label>
                </div>
              )}

              <div className="order-form-grid">
                <label>
                  Preferred date *
                  <input
                    type="date"
                    name="preferredDate"
                    value={form.preferredDate}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  Preferred time *
                  <input
                    type="time"
                    name="preferredTime"
                    value={form.preferredTime}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label className="order-full-field">
                  Special instructions <span>Optional</span>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={updateForm}
                    placeholder="Allergies, gifting notes, preferred delivery instructions…"
                    rows="4"
                  />
                </label>
              </div>
            </section>
          </section>

          <aside className="order-summary">
            <div className="order-summary-sticky">
              <div className="order-summary-heading">
                <div>
                  <p className="section-kicker">Step 3 of 3</p>
                  <h2>Your order</h2>
                </div>

                <span>{selectedItems.length} items</span>
              </div>

              {!selectedItems.length ? (
                <div className="order-empty-cart">
                  <span>✦</span>
                  <p>Your box is waiting for something delicious.</p>
                </div>
              ) : (
                <div className="order-summary-items">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="order-summary-item">
                      <img src={imageSource(item)} alt="" />

                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          {item.quantity} × {formatPrice(item.price)}
                        </small>
                      </div>

                      <b>
                        {formatPrice(item.quantity * Number(item.price))}
                      </b>
                    </div>
                  ))}
                </div>
              )}

              <div className="order-summary-totals">
                <p>
                  <span>Bakes subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </p>

                <p>
                  <span>Delivery fee</span>
                  <small>
                    {form.fulfillment === "collection"
                      ? "Free — pickup"
                      : deliveryEstimate?.estimated
                        ? formatPrice(deliveryEstimate.fee)
                        : "Enter address for estimate"}
                  </small>
                </p>

                <p>
                  <span>Estimated total</span>
                  <strong>{formatPrice(previewTotal)}</strong>
                </p>
              </div>

              {minimumIssues.length > 0 && (
                <div className="order-validation-message">
                  <strong>Your mixed box needs attention</strong>

                  {minimumIssues.map((issue) => (
                    <span key={issue.category}>
                      Add {issue.remaining} more{" "}
                      {issue.category === "Cookies" ? "cookie(s)" : "roll(s)"}{" "}
                      to complete your {issue.category} box.
                    </span>
                  ))}
                </div>
              )}

              {error && <div className="order-error-message">{error}</div>}

              <button
                className="order-submit-button"
                type="submit"
                disabled={submitting || !selectedItems.length}
              >
                {submitting
                  ? "Saving your order…"
                  : "Save order & continue to payment"}
                <span>→</span>
              </button>
            </div>
          </aside>
        </form>
      </main>
    </>
  );
}

export default OrderPage;