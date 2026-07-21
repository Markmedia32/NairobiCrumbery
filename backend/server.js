import "dotenv/config"; // MUST be the first import — loads .env before anything else runs

import express from "express";
import cors from "cors";
import path from "path";

import productRoutes from "./routes/products.js";
import ordersRouter from "./routes/orders.js";
import deliveryRoutes from "./routes/delivery.js";
import adminRoutes from "./routes/admin.js";
import supportRoutes from "./routes/support.js";


const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Nairobi Crumbery API running" });
});

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadRoot));
app.use("/api/products", productRoutes);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/support", supportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));