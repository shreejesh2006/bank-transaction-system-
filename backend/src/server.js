require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { pool } = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const demoRoutes = require("./routes/demoRoutes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", service: "Bank Transaction System API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/demo", demoRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({ message: "Internal server error", error: err.message });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  console.log(`Bank Transaction System API running on port ${port}`);
});
