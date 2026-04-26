const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { registerSchema, loginSchema } = require("../utils/validators");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const payload = registerSchema.parse(req.body);
    const hashed = await bcrypt.hash(payload.password, 10);

    const roleResult = await pool.query(`SELECT role_id, role_name FROM Roles WHERE role_name = $1`, [payload.role]);
    const role = roleResult.rows[0];
    if (!role) return res.status(400).json({ message: "Role not configured" });

    const existing = await pool.query(`SELECT user_id FROM Users WHERE email = $1`, [payload.email]);
    if (existing.rowCount > 0) return res.status(409).json({ message: "Email already exists" });

    const user = await pool.query(
      `
        INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING user_id, full_name, email
      `,
      [role.role_id, payload.fullName, payload.email, hashed, payload.phone]
    );

    if (payload.role === "CUSTOMER") {
      await pool.query(
        `
          INSERT INTO Customers (user_id, customer_code, address, kyc_status)
          VALUES ($1, $2, $3, 'PENDING')
        `,
        [user.rows[0].user_id, `CUST-${Date.now()}`, payload.address]
      );
      await pool.query(
        `
          INSERT INTO Notifications (user_id, title, message)
          VALUES ($1, 'Registration Submitted', 'Your account is created and pending KYC approval')
        `,
        [user.rows[0].user_id]
      );
    }

    return res.status(201).json({ message: "Registered successfully", user: user.rows[0] });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await pool.query(
      `
        SELECT u.user_id, u.full_name, u.email, u.password_hash, r.role_name
        FROM Users u
        JOIN Roles r ON r.role_id = u.role_id
        WHERE u.email = $1 AND u.status = 'ACTIVE'
      `,
      [payload.email]
    );

    if (!result.rows[0]) return res.status(401).json({ message: "Invalid credentials" });
    const user = result.rows[0];
    const match = await bcrypt.compare(payload.password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.user_id, role: user.role_name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role_name
      }
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
