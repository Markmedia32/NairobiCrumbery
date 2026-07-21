import { useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "";

const QUICK_QUESTIONS = [
  "Where is my order?",
  "How do I make payment?",
  "How does delivery work?",
  "Can I collect my order?",
];

function getBotReply(question) {
  const text = question.toLowerCase();

  if (
    text.includes("track") ||
    text.includes("where") ||
    text.includes("order") ||
    text.includes("delivery")
  ) {
    return {
      text: "You can track an existing order using the reference code sent after checkout and the phone number used for your order.",
      action: {
        label: "Track my order",
        to: "/track",
      },
    };
  }

  if (
    text.includes("pay") ||
    text.includes("mpesa") ||
    text.includes("m-pesa") ||
    text.includes("payment")
  ) {
    return {
      text: "After saving your order, the checkout page will show the M-Pesa payment instructions. Submit your M-Pesa code and optional screenshot so the bakery can confirm your payment.",
      action: {
        label: "Start an order",
        to: "/order",
      },
    };
  }

  if (
    text.includes("collect") ||
    text.includes("pickup") ||
    text.includes("pick up")
  ) {
    return {
      text: "Yes. Select Collection while placing your order. Your order confirmation will include the collection details and your reference number.",
      action: {
        label: "Place an order",
        to: "/order",
      },
    };
  }

  if (
    text.includes("custom") ||
    text.includes("cake") ||
    text.includes("bulk") ||
    text.includes("event")
  ) {
    return {
      text: "For custom, bulk, office, or event orders, send us the date, quantity, flavours, and any special requests through the support form below. The bakery will reply with availability and a quote.",
      action: null,
    };
  }

  return {
    text: "I can help with delivery updates, order tracking, payment, collection, custom orders, and bakery questions. Choose a suggested question or send a support request below.",
    action: null,
  };
}

function SupportPage() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am the Nairobi Crumbery helper. How can I help with your order today?",
    },
  ]);

  const [chatInput, setChatInput] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    contact: "",
    category: "Order enquiry",
    orderCode: "",
    message: "",
  });

  const [formState, setFormState] = useState({
    loading: false,
    error: "",
    success: "",
  });

  function askBot(question) {
    const cleanQuestion = question.trim();

    if (!cleanQuestion) return;

    const answer = getBotReply(cleanQuestion);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: "user",
        text: cleanQuestion,
      },
      {
        sender: "bot",
        text: answer.text,
        action: answer.action,
      },
    ]);

    setChatInput("");
  }

  function handleChatSubmit(event) {
    event.preventDefault();
    askBot(chatInput);
  }

  async function submitTicket(event) {
    event.preventDefault();

    setFormState({
      loading: true,
      error: "",
      success: "",
    });

    try {
      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send your support request.");
      }

      setFormState({
        loading: false,
        error: "",
        success: `Thank you. Your support reference is ${data.ticketCode}. The bakery has been notified.`,
      });

      setForm({
        customerName: "",
        contact: "",
        category: "Order enquiry",
        orderCode: "",
        message: "",
      });
    } catch (error) {
      setFormState({
        loading: false,
        error: error.message,
        success: "",
      });
    }
  }

  return (
    <main className="support-page">
      <section className="support-hero">
        <div className="support-hero-copy">
          <p className="section-kicker">We are here to help</p>

          <h1>
            Support that feels
            <br />
            <em>as warm as our bakes.</em>
          </h1>

          <p>
            Get quick answers, track an order, ask about delivery, or send a
            detailed request directly to the Nairobi Crumbery team.
          </p>

          <div className="support-hero-actions">
            <a href="#support-form" className="support-primary-link">
              Send a request <span>-&gt;</span>
            </a>

            <Link to="/track" className="support-secondary-link">
              Track an order
            </Link>
          </div>
        </div>

        <div className="support-hero-note">
          <span className="support-note-icon">?</span>
          <div>
            <strong>Have your order reference?</strong>
            <p>
              Use it with your checkout phone number to see your latest order
              update.
            </p>
          </div>
        </div>
      </section>

      <section className="support-help-grid">
        <article className="support-help-card">
          <span className="support-card-number">01</span>
          <h2>Track an order</h2>
          <p>
            Check payment and baking progress using your order reference and
            phone number.
          </p>
          <Link to="/track">Track my order -&gt;</Link>
        </article>

        <article className="support-help-card">
          <span className="support-card-number">02</span>
          <h2>Delivery questions</h2>
          <p>
            Ask about your address, delivery timing, rider arrangements, or
            collection.
          </p>
          <a href="#support-form">Ask the bakery -&gt;</a>
        </article>

        <article className="support-help-card">
          <span className="support-card-number">03</span>
          <h2>Custom & bulk orders</h2>
          <p>
            Planning an office treat, gifting, party, or a larger event? We can
            help you plan it.
          </p>
          <a href="#support-form">Request a quote -&gt;</a>
        </article>
      </section>

      <section className="support-chat-section">
        <div className="support-chat-intro">
          <p className="section-kicker">Quick self-service</p>
          <h2>Ask the Crumbery<br /><em>helper.</em></h2>
          <p>
            Get an instant answer for common order, delivery, collection, and
            payment questions.
          </p>

          <div className="support-question-pills">
            {QUICK_QUESTIONS.map((question) => (
              <button key={question} onClick={() => askBot(question)}>
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="support-chat-window">
          <div className="support-chat-header">
            <div className="support-chat-avatar">NC</div>
            <div>
              <strong>Nairobi Crumbery helper</strong>
              <span>Quick answers available</span>
            </div>
          </div>

          <div className="support-chat-messages">
            {messages.map((message, index) => (
              <div
                className={
                  message.sender === "user"
                    ? "support-message support-message-user"
                    : "support-message support-message-bot"
                }
                key={`${message.sender}-${index}`}
              >
                <p>{message.text}</p>

                {message.action && (
                  <Link to={message.action.to}>{message.action.label}</Link>
                )}
              </div>
            ))}
          </div>

          <form className="support-chat-input" onSubmit={handleChatSubmit}>
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about an order, payment, or delivery..."
            />
            <button type="submit" aria-label="Send chat question">
              -&gt;
            </button>
          </form>
        </div>
      </section>

      <section className="support-form-section" id="support-form">
        <div className="support-form-intro">
          <p className="section-kicker">Need a person?</p>
          <h2>Send the bakery<br /><em>your request.</em></h2>
          <p>
            Tell us what happened and include your order reference where
            possible. Your request is saved and sent directly to the bakery
            owner.
          </p>

          <div className="support-response-promise">
            <strong>Helpful tip</strong>
            <span>
              Include your phone number and order reference so the bakery can
              assist you faster.
            </span>
          </div>
        </div>

        <form className="support-form" onSubmit={submitTicket}>
          <div className="support-form-row">
            <label>
              Your name
              <input
                value={form.customerName}
                onChange={(event) =>
                  setForm({ ...form, customerName: event.target.value })
                }
                placeholder="Your full name"
                required
              />
            </label>

            <label>
              Phone or email
              <input
                value={form.contact}
                onChange={(event) =>
                  setForm({ ...form, contact: event.target.value })
                }
                placeholder="07XX XXX XXX or you@email.com"
                required
              />
            </label>
          </div>

          <div className="support-form-row">
            <label>
              What do you need help with?
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                <option>Order enquiry</option>
                <option>Delivery issue</option>
                <option>Payment issue</option>
                <option>Order tracking</option>
                <option>Collection enquiry</option>
                <option>Custom or bulk order</option>
                <option>Feedback</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Order reference (optional)
              <input
                value={form.orderCode}
                onChange={(event) =>
                  setForm({ ...form, orderCode: event.target.value.toUpperCase() })
                }
                placeholder="e.g. NC-260721-ABCD"
              />
            </label>
          </div>

          <label>
            Tell us what happened
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm({ ...form, message: event.target.value })
              }
              placeholder="Give us as much detail as you can so we can help quickly."
              required
            />
          </label>

          {formState.error && (
            <div className="support-form-alert support-form-error">
              {formState.error}
            </div>
          )}

          {formState.success && (
            <div className="support-form-alert support-form-success">
              {formState.success}
            </div>
          )}

          <button
            className="support-submit-button"
            type="submit"
            disabled={formState.loading}
          >
            {formState.loading ? "Sending your request..." : "Send support request"}
            <span>-&gt;</span>
          </button>
        </form>
      </section>
    </main>
  );
}

export default SupportPage;