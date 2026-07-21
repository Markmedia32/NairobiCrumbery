import express from "express";
import nodemailer from "nodemailer";
import crypto from "crypto";
import pool from "../config/db.js";

const router = express.Router();

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ||
  process.env.GMAIL_USER ||
  "nairobicrumbery@gmail.com";

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function createTicketCode() {
  const date = new Date();

  const datePart = [
    String(date.getFullYear()).slice(-2),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `SUP-${datePart}-${randomPart}`;
}

function getIssueType(category) {
  const categoryMap = {
    "Delivery issue": "late_delivery",
    "Order tracking": "late_delivery",
    Feedback: "quality_issue",
    "Order enquiry": "other",
    "Payment issue": "other",
    "Collection enquiry": "other",
    "Custom or bulk order": "other",
    Other: "other",
  };

  return categoryMap[category] || "other";
}

router.post("/tickets", async (req, res) => {
  try {
    const { customerName, contact, category, orderCode, message } = req.body;

    if (
      !customerName?.trim() ||
      !contact?.trim() ||
      !category?.trim() ||
      !message?.trim()
    ) {
      return res.status(400).json({
        error: "Please fill in your name, contact, category, and message.",
      });
    }

    const ticketCode = createTicketCode();

    await pool.query(
      `
        INSERT INTO support_tickets (
          ticket_code,
          customer_name,
          phone,
          issue_type,
          message
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        ticketCode,
        customerName.trim(),
        contact.trim(),
        getIssueType(category.trim()),
        message.trim(),
      ]
    );

    try {
      await mailer.sendMail({
        from: `"Nairobi Crumbery Support" <${process.env.GMAIL_USER}>`,
        to: SUPPORT_EMAIL,
        subject: `Support request ${ticketCode}: ${category.trim()}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#35170b;max-width:650px">
            <div style="background:#8b0505;color:#fffaf1;padding:24px;border-radius:14px 14px 0 0">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase">
                Nairobi Crumbery Support
              </p>
              <h1 style="margin:0;font-size:26px">New customer request</h1>
            </div>

            <div style="padding:24px;border:1px solid #eadbc7;border-top:0;border-radius:0 0 14px 14px">
              <p><strong>Ticket:</strong> ${ticketCode}</p>
              <p><strong>Customer:</strong> ${customerName.trim()}</p>
              <p><strong>Contact:</strong> ${contact.trim()}</p>
              <p><strong>Category:</strong> ${category.trim()}</p>
              <p><strong>Order reference:</strong> ${orderCode?.trim() || "Not provided"}</p>

              <h3 style="color:#8b0505">Customer message</h3>
              <p style="padding:14px;background:#fff4df;border-radius:10px;line-height:1.6">
                ${message.trim()}
              </p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      console.error(
        "Support ticket was saved, but support email failed:",
        mailError.message
      );
    }

    return res.status(201).json({
      message: "Your support request has been received.",
      ticketCode,
    });
  } catch (error) {
    console.error("Support ticket error:", error);

    return res.status(500).json({
      error: "We could not send your support request. Please try again.",
    });
  }
});

export default router;