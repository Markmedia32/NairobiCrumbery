import express from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const router = express.Router();

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "baking",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES = ["unpaid", "submitted", "paid"];

function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Sign in again." });
  }
}

function asMoney(value) {
  return Number(value || 0);
}

// Admin login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      error: "Admin login has not been configured on the server.",
    });
  }

  const validEmail =
    email?.trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase();

  const validPassword = password === process.env.ADMIN_PASSWORD;

  if (!validEmail || !validPassword) {
    return res.status(401).json({
      error: "Incorrect email or password.",
    });
  }

  const token = jwt.sign(
    {
      email: process.env.ADMIN_EMAIL,
      role: "owner",
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  return res.json({
    token,
    owner: process.env.ADMIN_EMAIL,
  });
});

// Dashboard totals
router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const [[sales]] = await pool.query(`
      SELECT
        COALESCE(SUM(
          CASE WHEN DATE(payment_approved_at) = CURDATE()
          THEN total ELSE 0 END
        ), 0) AS today_sales,

        COALESCE(SUM(
          CASE WHEN DATE(payment_approved_at) = CURDATE() - INTERVAL 1 DAY
          THEN total ELSE 0 END
        ), 0) AS yesterday_sales,

        COALESCE(SUM(
          CASE WHEN YEAR(payment_approved_at) = YEAR(CURDATE())
            AND MONTH(payment_approved_at) = MONTH(CURDATE())
          THEN total ELSE 0 END
        ), 0) AS month_sales,

        COALESCE(SUM(
          CASE WHEN payment_status = 'submitted'
          THEN total ELSE 0 END
        ), 0) AS awaiting_payment_approval,

        COUNT(
          CASE WHEN order_status IN ('pending', 'confirmed', 'baking', 'out_for_delivery')
          THEN 1 END
        ) AS active_orders,

        COUNT(
          CASE WHEN order_status = 'pending'
          THEN 1 END
        ) AS new_orders

      FROM orders
      WHERE order_status <> 'cancelled'
    `);

    const [[expenses]] = await pool.query(`
      SELECT
        COALESCE(SUM(
          CASE WHEN expense_date = CURDATE()
          THEN amount ELSE 0 END
        ), 0) AS today_expenses,

        COALESCE(SUM(
          CASE WHEN YEAR(expense_date) = YEAR(CURDATE())
            AND MONTH(expense_date) = MONTH(CURDATE())
          THEN amount ELSE 0 END
        ), 0) AS month_expenses

      FROM business_expenses
    `);

    const [[inventory]] = await pool.query(`
      SELECT COUNT(*) AS low_stock_count
      FROM inventory_items
      WHERE quantity <= reorder_level
    `);

    const [recentOrders] = await pool.query(`
      SELECT
        o.order_code,
        o.total,
        o.order_status,
        o.payment_status,
        o.created_at,
        c.full_name AS customer_name,
        c.phone AS customer_phone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC
      LIMIT 8
    `);

    return res.json({
      sales: {
        today: asMoney(sales.today_sales),
        yesterday: asMoney(sales.yesterday_sales),
        month: asMoney(sales.month_sales),
        awaitingApproval: asMoney(sales.awaiting_payment_approval),
      },
      expenses: {
        today: asMoney(expenses.today_expenses),
        month: asMoney(expenses.month_expenses),
      },
      profit: {
        month: asMoney(sales.month_sales) - asMoney(expenses.month_expenses),
      },
      orders: {
        active: Number(sales.active_orders || 0),
        new: Number(sales.new_orders || 0),
      },
      inventory: {
        lowStock: Number(inventory.low_stock_count || 0),
      },
      recentOrders: recentOrders.map((order) => ({
        ...order,
        total: asMoney(order.total),
      })),
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({ error: "Could not load dashboard data." });
  }
});

// All orders
router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status;
    const payment = req.query.payment;

    const filters = [];
    const values = [];

    if (status && ORDER_STATUSES.includes(status)) {
      filters.push("o.order_status = ?");
      values.push(status);
    }

    if (payment && PAYMENT_STATUSES.includes(payment)) {
      filters.push("o.payment_status = ?");
      values.push(payment);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [orders] = await pool.query(
      `
        SELECT
          o.order_code,
          o.fulfillment_type,
          o.delivery_address,
          o.preferred_date,
          o.preferred_time,
          o.total,
          o.order_status,
          o.payment_status,
          o.mpesa_code,
          o.payment_proof_url,
          o.created_at,
          c.full_name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        ${whereClause}
        ORDER BY o.created_at DESC
      `,
      values
    );

    return res.json(
      orders.map((order) => ({
        ...order,
        total: asMoney(order.total),
      }))
    );
  } catch (error) {
    console.error("Admin orders error:", error);
    return res.status(500).json({ error: "Could not load orders." });
  }
});

// One order with items
router.get("/orders/:orderCode", requireAdmin, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `
        SELECT
          o.*,
          c.full_name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        WHERE o.order_code = ?
        LIMIT 1
      `,
      [req.params.orderCode]
    );

    if (!orders.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orders[0];

    const [items] = await pool.query(
      `
        SELECT
          p.name,
          oi.quantity,
          oi.unit_price,
          oi.line_total
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `,
      [order.id]
    );

    return res.json({
      ...order,
      subtotal: asMoney(order.subtotal),
      delivery_fee: asMoney(order.delivery_fee),
      total: asMoney(order.total),
      items: items.map((item) => ({
        ...item,
        unit_price: asMoney(item.unit_price),
        line_total: asMoney(item.line_total),
      })),
    });
  } catch (error) {
    console.error("Admin order detail error:", error);
    return res.status(500).json({ error: "Could not load this order." });
  }
});

// Approve payment or update an order's progress
router.patch("/orders/:orderCode", requireAdmin, async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const [rows] = await pool.query(
      `
        SELECT order_status, payment_status
        FROM orders
        WHERE order_code = ?
        LIMIT 1
      `,
      [req.params.orderCode]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    const currentOrder = rows[0];

    if (orderStatus && !ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ error: "Invalid order status." });
    }

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid payment status." });
    }

    const nextPaymentStatus = paymentStatus || currentOrder.payment_status;

    let nextOrderStatus = orderStatus || currentOrder.order_status;

    if (
      nextPaymentStatus === "paid" &&
      currentOrder.order_status === "pending" &&
      !orderStatus
    ) {
      nextOrderStatus = "confirmed";
    }

    await pool.query(
      `
        UPDATE orders
        SET
          order_status = ?,
          payment_status = ?,
          payment_approved_at = CASE
            WHEN ? = 'paid' AND payment_approved_at IS NULL THEN NOW()
            ELSE payment_approved_at
          END
        WHERE order_code = ?
      `,
      [
        nextOrderStatus,
        nextPaymentStatus,
        nextPaymentStatus,
        req.params.orderCode,
      ]
    );

    return res.json({
      message: "Order updated successfully.",
      orderStatus: nextOrderStatus,
      paymentStatus: nextPaymentStatus,
    });
  } catch (error) {
    console.error("Admin order update error:", error);
    return res.status(500).json({ error: "Could not update this order." });
  }
});

// Expenses
router.get("/expenses", requireAdmin, async (req, res) => {
  try {
    const [expenses] = await pool.query(`
      SELECT *
      FROM business_expenses
      ORDER BY expense_date DESC, id DESC
    `);

    return res.json(
      expenses.map((expense) => ({
        ...expense,
        amount: asMoney(expense.amount),
      }))
    );
  } catch (error) {
    console.error("Expenses error:", error);
    return res.status(500).json({ error: "Could not load expenses." });
  }
});

router.post("/expenses", requireAdmin, async (req, res) => {
  try {
    const { title, category, amount, expenseDate, notes } = req.body;

    if (!title?.trim() || !category?.trim() || Number(amount) <= 0 || !expenseDate) {
      return res.status(400).json({
        error: "Title, category, amount, and expense date are required.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO business_expenses (
          title,
          category,
          amount,
          expense_date,
          notes
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        title.trim(),
        category.trim(),
        Number(amount),
        expenseDate,
        notes?.trim() || null,
      ]
    );

    return res.status(201).json({
      message: "Expense saved.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ error: "Could not save expense." });
  }
});

router.delete("/expenses/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM business_expenses WHERE id = ?`, [
      req.params.id,
    ]);

    return res.json({ message: "Expense deleted." });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(500).json({ error: "Could not delete expense." });
  }
});

// Inventory
router.get("/inventory", requireAdmin, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT *
      FROM inventory_items
      ORDER BY
        quantity <= reorder_level DESC,
        name ASC
    `);

    return res.json(
      items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        reorder_level: Number(item.reorder_level),
        unit_cost: item.unit_cost === null ? null : asMoney(item.unit_cost),
      }))
    );
  } catch (error) {
    console.error("Inventory error:", error);
    return res.status(500).json({ error: "Could not load inventory." });
  }
});

router.post("/inventory", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      unit,
      quantity,
      reorderLevel,
      unitCost,
      supplier,
    } = req.body;

    if (!name?.trim() || Number(quantity) < 0 || Number(reorderLevel) < 0) {
      return res.status(400).json({
        error: "Name, quantity, and reorder level are required.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO inventory_items (
          name,
          unit,
          quantity,
          reorder_level,
          unit_cost,
          supplier
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        unit?.trim() || "units",
        Number(quantity),
        Number(reorderLevel),
        unitCost === "" || unitCost === undefined ? null : Number(unitCost),
        supplier?.trim() || null,
      ]
    );

    return res.status(201).json({
      message: "Inventory item saved.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Create inventory error:", error);
    return res.status(500).json({ error: "Could not save inventory item." });
  }
});

router.patch("/inventory/:id", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      unit,
      quantity,
      reorderLevel,
      unitCost,
      supplier,
    } = req.body;

    if (!name?.trim() || Number(quantity) < 0 || Number(reorderLevel) < 0) {
      return res.status(400).json({
        error: "Name, quantity, and reorder level are required.",
      });
    }

    await pool.query(
      `
        UPDATE inventory_items
        SET
          name = ?,
          unit = ?,
          quantity = ?,
          reorder_level = ?,
          unit_cost = ?,
          supplier = ?
        WHERE id = ?
      `,
      [
        name.trim(),
        unit?.trim() || "units",
        Number(quantity),
        Number(reorderLevel),
        unitCost === "" || unitCost === undefined ? null : Number(unitCost),
        supplier?.trim() || null,
        req.params.id,
      ]
    );

    return res.json({ message: "Inventory item updated." });
  } catch (error) {
    console.error("Update inventory error:", error);
    return res.status(500).json({ error: "Could not update inventory item." });
  }
});

router.delete("/inventory/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM inventory_items WHERE id = ?`, [
      req.params.id,
    ]);

    return res.json({ message: "Inventory item deleted." });
  } catch (error) {
    console.error("Delete inventory error:", error);
    return res.status(500).json({ error: "Could not delete inventory item." });
  }
});

export default router;