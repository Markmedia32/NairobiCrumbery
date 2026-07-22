import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "baking",
  "out_for_delivery",
  "delivered",
];

const STATUS_LABELS = {
  pending: "Order received",
  confirmed: "Confirmed",
  baking: "Baking",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatPrice(value) {
  return `KSh ${Number(value || 0).toLocaleString()}`;
}

function TrackOrderPage() {
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Scrolls to top once a tracking result loads, since the result card
  // renders below the search form and would otherwise leave the user mid-page.
  useEffect(() => {
    if (order) {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  }, [order]);

  async function handleSearch(event) {
    event.preventDefault();

    setError("");
    setOrder(null);
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/orders/${encodeURIComponent(
          orderCode.trim()
        )}/track?phone=${encodeURIComponent(phone.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not find that order.");
      }

      setOrder(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const currentStepIndex = order
    ? STATUS_STEPS.indexOf(order.orderStatus)
    : -1;

  return (
    <main className="tracking-page">
      <section className="tracking-hero">
        <div className="tracking-hero-copy">
          <p className="section-kicker">Order updates, in one place</p>
          <h1>
            Follow every
            <br />
            <em>sweet step.</em>
          </h1>
          <p>
            Enter the order reference and phone number you used at checkout to
            see your latest update.
          </p>
        </div>

        <form onSubmit={handleSearch} className="tracking-search-card">
          <p className="tracking-form-title">Find your order</p>

          <label>
            Order reference code
            <input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
              placeholder="e.g. NC-260721-SWXT"
              required
            />
          </label>

          <label>
            Phone number used at checkout
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              inputMode="tel"
              required
            />
          </label>

          {error && <div className="tracking-error">{error}</div>}

          <button className="tracking-submit" type="submit" disabled={loading}>
            {loading ? "Finding your order..." : "Track my order"}
            <span aria-hidden="true">-&gt;</span>
          </button>
        </form>
      </section>

      {order && (
        <section className="tracking-result">
          <div className="tracking-result-heading">
            <div>
              <p className="section-kicker">Order {order.orderCode}</p>
              <h2>{STATUS_LABELS[order.orderStatus] || order.orderStatus}</h2>
            </div>

            <div className={`tracking-payment tracking-payment-${order.paymentStatus}`}>
              <span>Payment</span>
              <strong>
                {order.paymentStatus === "paid" && "Confirmed"}
                {order.paymentStatus === "submitted" && "Under review"}
                {order.paymentStatus === "unpaid" && "Awaiting payment"}
              </strong>
            </div>
          </div>

          {order.orderStatus !== "cancelled" && (
            <div className="order-tracking-steps">
              {STATUS_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={index <= currentStepIndex ? "step done" : "step"}
                >
                  <span className="step-number">{index + 1}</span>
                  {STATUS_LABELS[step]}
                </div>
              ))}
            </div>
          )}

          <div className="tracking-details-grid">
            <div className="tracking-items">
              <h3>Your bakes</h3>

              {order.items.map((item, index) => (
                <div key={index} className="tracking-item">
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.quantity} x {formatPrice(item.unitPrice)}
                    </small>
                  </div>

                  <b>{formatPrice(item.lineTotal)}</b>
                </div>
              ))}
            </div>

            <div className="tracking-totals">
              <h3>Order total</h3>

              <p>
                <span>Bakes subtotal</span>
                <strong>{formatPrice(order.subtotal)}</strong>
              </p>

              {order.fulfillmentType === "delivery" && (
                <p>
                  <span>
                    Delivery fee{" "}
                    {order.distanceKm ? `(~${order.distanceKm}km)` : ""}
                  </span>
                  <strong>{formatPrice(order.deliveryFee)}</strong>
                </p>
              )}

              <p>
                <span>Total</span>
                <strong>{formatPrice(order.total)}</strong>
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default TrackOrderPage;