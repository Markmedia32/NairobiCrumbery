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
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Nairobi Crumbery API running" });
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/products", productRoutes);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/support", supportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));