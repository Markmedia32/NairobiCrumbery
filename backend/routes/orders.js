import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import pool from "../config/db.js";
import { CATEGORY_LABELS } from "./products.js";
import { estimateDelivery } from "./delivery.js";
import { queueEmail, resend, EMAIL_FROM, OWNER_EMAIL } from "./email.js";

const router = express.Router();

const SHOP_MPESA_PHONE = process.env.SHOP_MPESA_PHONE || "0797168003";
const RECIPIENT_NAME = "Wambui Gatume";
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const FALLBACK_DELIVERY_FEE = 250;

// File upload setup
const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const uploadDir = path.join(uploadRoot, "payment-proofs");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${req.params.orderCode}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

function createOrderCode() {
  const date = new Date();

  const dayCode = [
    String(date.getFullYear()).slice(-2),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomCode = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `NC-${dayCode}-${randomCode}`;
}

function approvalToken(orderCode) {
  return crypto.createHmac("sha256", ADMIN_SECRET).update(orderCode).digest("hex");
}

async function getCategoryRules(connection) {
  const [rules] = await connection.query(
    `SELECT category, minimum_quantity FROM category_rules`
  );

  return rules.reduce(
    (map, rule) => ({ ...map, [rule.category]: rule.minimum_quantity }),
    {}
  );
}

function validateMixedBoxMinimums(items, categoryRules) {
  const totals = items.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + item.quantity;
    return accumulator;
  }, {});

  for (const [category, minimum] of Object.entries(categoryRules)) {
    const total = totals[category] || 0;

    if (total > 0 && total < minimum) {
      const label = CATEGORY_LABELS[category] || category;
      return `${label} are mix-and-match. Please choose any ${minimum} in total.`;
    }
  }

  return null;
}

async function findOrCreateCustomer(connection, customer) {
  const [existing] = await connection.query(
    `SELECT id FROM customers WHERE phone = ? LIMIT 1`,
    [customer.phone.trim()]
  );

  if (existing.length) {
    await connection.query(
      `UPDATE customers SET full_name = ?, email = COALESCE(?, email) WHERE id = ?`,
      [customer.name.trim(), customer.email?.trim() || null, existing[0].id]
    );
    return existing[0].id;
  }

  const [result] = await connection.query(
    `INSERT INTO customers (full_name, phone, email) VALUES (?, ?, ?)`,
    [customer.name.trim(), customer.phone.trim(), customer.email?.trim() || null]
  );

  return result.insertId;
}

// Create order
router.post("/", async (req, res) => {
  let connection;

  try {
    const { customer, fulfillment, notes, items } = req.body;

    if (!customer?.name?.trim() || !customer?.phone?.trim()) {
      return res.status(400).json({ error: "Customer name and phone number are required." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Please add at least one product to your order." });
    }

    if (fulfillment?.type === "delivery" && !fulfillment?.address?.trim()) {
      return res.status(400).json({ error: "Please enter a delivery address." });
    }

    connection = await pool.getConnection();

    const categoryRules = await getCategoryRules(connection);

    const productIds = items.map((item) => item.product_id);

    const [databaseProducts] = await connection.query(
      `SELECT id, name, category, price FROM products WHERE id IN (?) AND is_active = TRUE`,
      [productIds]
    );

    if (databaseProducts.length !== productIds.length) {
      return res.status(400).json({
        error: "One or more products are unavailable. Refresh the page and try again.",
      });
    }

    const productMap = new Map(
      databaseProducts.map((product) => [String(product.id), product])
    );

    const safeItems = items.map((item) => {
      const product = productMap.get(String(item.product_id));
      const quantity = Number(item.quantity);

      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Invalid product quantity.");
      }

      return {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        category_label: CATEGORY_LABELS[product.category] || product.category,
        unit_price: Number(product.price),
        quantity,
        line_total: Number(product.price) * quantity,
      };
    });

    const minimumError = validateMixedBoxMinimums(safeItems, categoryRules);
    if (minimumError) return res.status(400).json({ error: minimumError });

    const subtotal = safeItems.reduce((total, item) => total + item.line_total, 0);

    let deliveryLat = null;
    let deliveryLng = null;
    let distanceKm = null;
    let deliveryFee = 0;
    let deliveryAddress = "Collection - Membley, Ruiru";
    let deliveryEtaLabel = null;
    let feeWasEstimated = true;

    if (fulfillment.type === "delivery") {
      deliveryAddress = fulfillment.address.trim();
      const estimate = await estimateDelivery(deliveryAddress);

      if (estimate) {
        deliveryLat = estimate.lat;
        deliveryLng = estimate.lng;
        distanceKm = estimate.distanceKm;
        deliveryFee = estimate.fee;
        deliveryEtaLabel = distanceKm <= 5 ? "20-35 mins" : "35-60 mins";
      } else {
        deliveryFee = FALLBACK_DELIVERY_FEE;
        feeWasEstimated = false;
      }
    }

    const total = subtotal + deliveryFee;
    const orderCode = createOrderCode();

    await connection.beginTransaction();

    const customerId = await findOrCreateCustomer(connection, customer);

    const combinedNotes = [
      notes?.trim(),
      fulfillment.landmark?.trim() ? `Landmark: ${fulfillment.landmark.trim()}` : null,
      fulfillment.preferredDate ? `Preferred date: ${fulfillment.preferredDate}` : null,
      fulfillment.preferredTime ? `Preferred time: ${fulfillment.preferredTime}` : null,
      !feeWasEstimated ? "Delivery fee auto-estimate failed - confirm manually." : null,
    ]
      .filter(Boolean)
      .join(" | ") || null;

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        order_code, customer_id, fulfillment_type, delivery_address, landmark,
        delivery_lat, delivery_lng, distance_km, delivery_fee, delivery_eta_label,
        preferred_date, preferred_time, subtotal, total,
        order_status, payment_status, customer_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderCode, customerId, fulfillment.type, deliveryAddress,
        fulfillment.landmark?.trim() || null, deliveryLat, deliveryLng, distanceKm,
        deliveryFee, deliveryEtaLabel, fulfillment.preferredDate || null,
        fulfillment.preferredTime || null, subtotal, total,
        "pending", "unpaid", combinedNotes,
      ]
    );

    const orderId = orderResult.insertId;

    await connection.query(
      `INSERT INTO order_items (
        order_id, product_id, flavour_id, quantity, unit_price, line_total
      ) VALUES ?`,
      [
        safeItems.map((item) => [
          orderId, item.product_id, null, item.quantity, item.unit_price, item.line_total,
        ]),
      ]
    );

    await connection.commit();

    const emailItems = safeItems
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${item.product_name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">KSh ${item.line_total.toLocaleString()}</td>
          </tr>
        `
      )
      .join("");

    const customerEmail = customer.email?.trim();
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");
    const trackingUrl = frontendUrl ? `${frontendUrl}/track` : null;

    let emailSent = false;
    let customerEmailSent = false;

    // Email sent to bakery owner
    try {
      queueEmail({
        from: "Nairobi Crumbery Orders <orders@nairobicrumbery.co.ke>",
        to: OWNER_EMAIL,
        reply_to: customerEmail || OWNER_EMAIL,
        subject: `New Order ${orderCode} - KSh ${total.toLocaleString()}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#35170b;max-width:650px">
            <h1 style="color:#8b0505">New Nairobi Crumbery Order</h1>
            <p><strong>Order code:</strong> ${orderCode}</p>
            <p><strong>Customer:</strong> ${customer.name} - ${customer.phone}</p>
            <p><strong>Fulfillment:</strong> ${fulfillment.type}</p>
            <p><strong>Address:</strong> ${deliveryAddress}</p>
            <p>
              <strong>Preferred time:</strong>
              ${fulfillment.preferredDate || "Not specified"} ${fulfillment.preferredTime || ""}
            </p>
            <p><strong>Notes:</strong> ${combinedNotes || "None"}</p>
            <h3>Order items</h3>
            <table style="border-collapse:collapse;width:100%">
              <thead>
                <tr style="background:#ffebc4">
                  <th style="padding:8px;text-align:left">Product</th>
                  <th style="padding:8px;text-align:left">Qty</th>
                  <th style="padding:8px;text-align:left">Total</th>
                </tr>
              </thead>
              <tbody>${emailItems}</tbody>
            </table>
            <p><strong>Bakes subtotal:</strong> KSh ${subtotal.toLocaleString()}</p>
            <p>
              <strong>Delivery fee:</strong> KSh ${deliveryFee.toLocaleString()}
              ${distanceKm ? `(~${distanceKm}km)` : ""}
              ${!feeWasEstimated ? " - ESTIMATE FAILED, CONFIRM MANUALLY" : ""}
            </p>
            <h2 style="color:#8b0505">Total: KSh ${total.toLocaleString()}</h2>
            <p>Customer will submit their M-Pesa code and screenshot through the website. You will get a follow-up email once they do.</p>
          </div>
        `,
      });

      emailSent = true;
    } catch (emailError) {
      console.error("Order was saved, but owner email failed:", emailError.message);
    }

    // Confirmation email sent to customer
    if (customerEmail) {
      try {
        queueEmail({
          from: "Nairobi Crumbery <orders@nairobicrumbery.co.ke>",
          to: customerEmail,
          subject: `We received your order ${orderCode}`,
          html: `
            <div style="font-family:Arial,sans-serif;color:#35170b;max-width:650px;margin:auto">
              <div style="background:#8b0505;color:#fffaf1;padding:28px;border-radius:16px 16px 0 0">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase">Nairobi Crumbery</p>
                <h1 style="margin:0;font-size:28px">We have received your order!</h1>
              </div>
              <div style="padding:28px;border:1px solid #eadbc7;border-top:0;border-radius:0 0 16px 16px;background:#fffdf8">
                <p>Hi ${customer.name.trim()},</p>
                <p>Thank you for ordering with Nairobi Crumbery. Keep your reference number handy whenever you contact us.</p>
                <p style="background:#ffebc4;padding:14px 16px;border-radius:10px">
                  <strong>Order reference:</strong> ${orderCode}
                </p>
                <p>
                  <strong>Fulfillment:</strong> ${fulfillment.type === "delivery" ? "Delivery" : "Collection"}<br>
                  <strong>${fulfillment.type === "delivery" ? "Delivery address" : "Collection point"}:</strong> ${deliveryAddress}
                </p>
                <h2 style="font-size:18px;color:#8b0505">Your order</h2>
                <table style="border-collapse:collapse;width:100%">
                  <thead>
                    <tr style="background:#ffebc4">
                      <th style="padding:8px;text-align:left">Item</th>
                      <th style="padding:8px;text-align:left">Qty</th>
                      <th style="padding:8px;text-align:left">Total</th>
                    </tr>
                  </thead>
                  <tbody>${emailItems}</tbody>
                </table>
                <p>
                  <strong>Bakes subtotal:</strong> KSh ${subtotal.toLocaleString()}<br>
                  <strong>Delivery fee:</strong> KSh ${deliveryFee.toLocaleString()}<br>
                  <strong style="font-size:18px;color:#8b0505">Total: KSh ${total.toLocaleString()}</strong>
                </p>
                <p>
                  Please complete payment by M-Pesa to <strong>${SHOP_MPESA_PHONE}</strong>,
                  then submit your M-Pesa code and payment screenshot on the website.
                </p>
                ${
                  trackingUrl
                    ? `<p><a href="${trackingUrl}" style="display:inline-block;background:#8b0505;color:#fffaf1;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Track your order</a></p>`
                    : ""
                }
                <p style="color:#796151;font-size:13px;margin-top:24px">
                  Questions? Reply to this email and include your order reference: ${orderCode}.
                </p>
              </div>
            </div>
          `,
        });

        customerEmailSent = true;
      } catch (emailError) {
        console.error("Order was saved, but customer confirmation email failed:", emailError.message);
      }
    }

    return res.status(201).json({
      message: "Order saved successfully.",
      orderCode, subtotal, deliveryFee, distanceKm, total,
      fulfillmentType: fulfillment.type, emailSent, customerEmailSent,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Order creation error:", error);
    return res.status(500).json({ error: "Could not save your order. Please try again." });
  } finally {
    if (connection) connection.release();
  }
});

// Submit payment proof
router.post("/:orderCode/payment", upload.single("screenshot"), async (req, res) => {
  const { orderCode } = req.params;
  const { phone, mpesaCode } = req.body;

  if (!phone?.trim() || !mpesaCode?.trim()) {
    return res.status(400).json({ error: "Phone number and M-Pesa code are required." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.total, c.phone
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE o.order_code = ? LIMIT 1`,
      [orderCode]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (rows[0].phone !== phone.trim()) {
      return res.status(403).json({ error: "Phone number doesn't match this order." });
    }

    const screenshotPath = req.file ? req.file.path : null;
    const screenshotUrl = req.file ? `/uploads/payment-proofs/${req.file.filename}` : null;

    await pool.query(
      `UPDATE orders
       SET mpesa_code = ?, payment_proof_url = ?, payment_status = 'submitted', payment_submitted_at = NOW()
       WHERE id = ?`,
      [mpesaCode.trim().toUpperCase(), screenshotUrl, rows[0].id]
    );

    const token = approvalToken(orderCode);
    const backendUrl = `${req.protocol}://${req.get("host")}`;
    const approveLink = `${backendUrl}/api/orders/${orderCode}/approve-payment?token=${token}`;

    // Resend needs attachment content as base64, not a file path
    const attachments = [];
    if (screenshotPath) {
      try {
        const fileBuffer = fs.readFileSync(screenshotPath);
        attachments.push({
          filename: req.file.originalname,
          content: fileBuffer.toString("base64"),
        });
      } catch (readError) {
        console.error("Could not attach screenshot to email:", readError.message);
      }
    }

    try {
      const { error: resendError } = await resend.emails.send({
        from: EMAIL_FROM,
        to: OWNER_EMAIL,
        reply_to: OWNER_EMAIL,
        subject: `Payment submitted for ${orderCode} - KSh ${Number(rows[0].total).toLocaleString()}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#35170b;max-width:650px">
            <h1 style="color:#8b0505">Payment submitted</h1>
            <p><strong>Order:</strong> ${orderCode}</p>
            <p><strong>Amount expected:</strong> KSh ${Number(rows[0].total).toLocaleString()}</p>
            <p>
              <strong>M-Pesa code entered:</strong>
              <span style="font-size:20px;font-weight:bold">${mpesaCode.trim().toUpperCase()}</span>
            </p>
            <p>Check your M-Pesa messages for this exact code. If it matches and the amount is correct, click below to approve.</p>
            <p>
              <a href="${approveLink}" style="background:#8b0505;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">
                Approve Payment
              </a>
            </p>
            <p style="color:#888;font-size:13px">If the code doesn't match, do not approve it. Contact the customer instead.</p>
          </div>
        `,
        attachments,
      });

      if (resendError) {
        console.error("Payment submitted, but alert email failed:", resendError.message);
      }
    } catch (emailError) {
      console.error("Payment submitted, but alert email failed:", emailError.message);
    }

    return res.status(200).json({
      message: "Payment details submitted.",
      orderCode,
    });
  } catch (error) {
    console.error("Payment submission error:", error);
    return res.status(500).json({ error: "Could not submit payment details. Please try again." });
  }
});

// Approve payment
router.get("/:orderCode/approve-payment", async (req, res) => {
  const { orderCode } = req.params;
  const { token } = req.query;

  if (!token || token !== approvalToken(orderCode)) {
    return res.status(403).send("Invalid or expired approval link.");
  }

  try {
    const [result] = await pool.query(
      `UPDATE orders
       SET payment_status = 'paid', payment_approved_at = NOW(), order_status = 'confirmed'
       WHERE order_code = ? AND payment_status = 'submitted'`,
      [orderCode]
    );

    if (result.affectedRows === 0) {
      return res.send(
        `<p style="font-family:sans-serif">Order ${orderCode} was already approved, or no submitted payment was found.</p>`
      );
    }

    return res.send(
      `<p style="font-family:sans-serif">Payment approved for order ${orderCode}. Order marked as confirmed.</p>`
    );
  } catch (error) {
    console.error("Approval error:", error);
    return res.status(500).send("Something went wrong approving this order.");
  }
});

// Track order
router.get("/:orderCode/track", async (req, res) => {
  const { orderCode } = req.params;
  const { phone } = req.query;

  if (!phone?.trim()) {
    return res.status(400).json({ error: "Please provide the phone number used on the order." });
  }

  try {
    const [orders] = await pool.query(
      `SELECT
        o.order_code, o.fulfillment_type, o.order_status, o.payment_status,
        o.subtotal, o.delivery_fee, o.total, o.distance_km, o.delivery_eta_label,
        o.created_at, c.phone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.order_code = ?
      LIMIT 1`,
      [orderCode]
    );

    if (!orders.length || orders[0].phone !== phone.trim()) {
      return res.status(404).json({
        error: "We couldn't find an order matching that code and phone number.",
      });
    }

    const order = orders[0];

    const [items] = await pool.query(
      `SELECT p.name, oi.quantity, oi.unit_price, oi.line_total
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = (SELECT id FROM orders WHERE order_code = ?)`,
      [orderCode]
    );

    return res.status(200).json({
      orderCode: order.order_code,
      fulfillmentType: order.fulfillment_type,
      orderStatus: order.order_status,
      paymentStatus: order.payment_status,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee),
      total: Number(order.total),
      distanceKm: order.distance_km,
      etaLabel: order.delivery_eta_label,
      createdAt: order.created_at,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
      })),
    });
  } catch (error) {
    console.error("Order tracking error:", error);
    return res.status(500).json({ error: "Could not fetch order status." });
  }
});

export default router;