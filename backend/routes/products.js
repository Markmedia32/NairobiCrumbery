import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Shared with the order route so stored category codes are always shown as
// customer-friendly names in validation messages and order emails.
export const CATEGORY_LABELS = {
  cinnamon_roll: "Cinnamon Rolls",
  cake_loaf: "Cake Loaves",
  cookie: "Cookies",
};

router.get("/", async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT
        p.id,
        p.name,

        CASE p.category
          WHEN 'cinnamon_roll' THEN 'Cinnamon Rolls'
          WHEN 'cake_loaf' THEN 'Cake Loaves'
          WHEN 'cookie' THEN 'Cookies'
        END AS category,

        p.price,
        p.description,
        p.image_filename AS image_url,
        p.is_active,
        p.is_bestseller,

        COALESCE(
          rules_code.min_order_qty,
          rules_display.min_order_qty,
          p.min_quantity,
          1
        ) AS minimum_quantity,

        COALESCE(
          rules_code.rule_label,
          rules_display.rule_label,
          rules_code.rule_description,
          rules_display.rule_description
        ) AS rule_description

      FROM products p

      LEFT JOIN category_rules rules_code
        ON rules_code.category = p.category

      LEFT JOIN category_rules rules_display
        ON rules_display.category =
          CASE p.category
            WHEN 'cinnamon_roll' THEN 'Cinnamon Rolls'
            WHEN 'cake_loaf' THEN 'Cake Loaves'
            WHEN 'cookie' THEN 'Cookies'
          END

      WHERE p.is_active = TRUE

      ORDER BY
        FIELD(p.category, 'cinnamon_roll', 'cake_loaf', 'cookie'),
        p.price ASC
    `);

    return res.status(200).json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);

    return res.status(500).json({
      error: "Failed to fetch products",
      details: error.message,
    });
  }
});

export default router;