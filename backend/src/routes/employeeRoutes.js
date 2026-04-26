const express = require("express");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireRole("EMPLOYEE", "ADMIN"));

router.get("/branch-customers", async (req, res) => {
  const result = await pool.query(
    `
      SELECT u.full_name, u.email, c.customer_code, c.kyc_status
      FROM Customers c
      JOIN Users u ON u.user_id = c.user_id
      ORDER BY u.created_at DESC
      LIMIT 200
    `
  );
  return res.json(result.rows);
});

router.patch("/customers/:customerCode/kyc", async (req, res) => {
  const { status } = req.body;
  const result = await pool.query(
    `UPDATE Customers SET kyc_status = $1 WHERE customer_code = $2 RETURNING customer_code, kyc_status`,
    [status, req.params.customerCode]
  );
  return res.json(result.rows[0]);
});

router.get("/reports/branch", async (req, res) => {
  const result = await pool.query(`SELECT * FROM v_branch_performance ORDER BY total_customers DESC`);
  return res.json(result.rows);
});

module.exports = router;
