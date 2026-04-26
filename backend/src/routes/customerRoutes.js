const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { writeAuditLog } = require("../middleware/audit");
const { moneySchema, transferSchema } = require("../utils/validators");
const transactionService = require("../services/transactionService");

const router = express.Router();

router.use(requireAuth, requireRole("CUSTOMER"));

router.get("/profile", async (req, res) => {
  const result = await pool.query(
    `
      SELECT u.user_id, u.full_name, u.email, u.phone, c.customer_code, c.kyc_status
      FROM Users u
      JOIN Customers c ON c.user_id = u.user_id
      WHERE u.user_id = $1
    `,
    [req.user.userId]
  );
  return res.json(result.rows[0]);
});

router.get("/accounts", async (req, res) => {
  const result = await pool.query(
    `
      SELECT a.account_number, a.account_type, a.balance, a.status
      FROM Accounts a
      JOIN Customers c ON c.customer_id = a.customer_id
      WHERE c.user_id = $1
      ORDER BY a.created_at DESC
    `,
    [req.user.userId]
  );
  return res.json(result.rows);
});

router.get("/accounts/:accountNumber", async (req, res) => {
  const result = await pool.query(
    `
      SELECT a.account_number, a.account_type, a.balance, a.status, b.branch_name, b.branch_code
      FROM Accounts a
      JOIN Customers c ON c.customer_id = a.customer_id
      JOIN Branches b ON b.branch_id = a.branch_id
      WHERE c.user_id = $1 AND a.account_number = $2
    `,
    [req.user.userId, req.params.accountNumber]
  );
  return res.json(result.rows[0] || null);
});

router.post("/deposit", async (req, res) => {
  try {
    const payload = moneySchema.parse(req.body);
    const result = await transactionService.deposit({
      accountNumber: payload.accountNumber,
      amount: payload.amount,
      initiatedBy: req.user.userId,
      remarks: payload.remarks
    });
    await writeAuditLog({
      userId: req.user.userId,
      actionType: "DEPOSIT",
      entityType: "Accounts",
      entityId: null,
      metadata: result
    });
    await pool.query(
      `INSERT INTO Notifications (user_id, title, message) VALUES ($1, $2, $3)`,
      [req.user.userId, "Deposit Successful", `Amount credited. Ref: ${result.transaction_ref}`]
    );
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/withdraw", async (req, res) => {
  try {
    const payload = moneySchema.parse(req.body);
    const result = await transactionService.withdraw({
      accountNumber: payload.accountNumber,
      amount: payload.amount,
      initiatedBy: req.user.userId,
      remarks: payload.remarks
    });
    await writeAuditLog({
      userId: req.user.userId,
      actionType: "WITHDRAW",
      entityType: "Accounts",
      entityId: null,
      metadata: result
    });
    await pool.query(
      `INSERT INTO Notifications (user_id, title, message) VALUES ($1, $2, $3)`,
      [req.user.userId, "Withdrawal Successful", `Amount debited. Ref: ${result.transaction_ref}`]
    );
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/transfer", async (req, res) => {
  try {
    const payload = transferSchema.parse(req.body);
    const result = await transactionService.transfer({
      fromAccountNumber: payload.fromAccountNumber,
      toAccountNumber: payload.toAccountNumber,
      amount: payload.amount,
      initiatedBy: req.user.userId,
      remarks: payload.remarks
    });
    await writeAuditLog({
      userId: req.user.userId,
      actionType: "TRANSFER",
      entityType: "Transactions",
      entityId: result.transaction_id,
      metadata: result
    });
    await pool.query(
      `INSERT INTO Notifications (user_id, title, message) VALUES ($1, $2, $3)`,
      [req.user.userId, "Transfer Successful", `Transfer completed. Ref: ${result.transaction_ref}`]
    );
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/beneficiaries", async (req, res) => {
  const { accountNumber, beneficiaryAccountNumber, beneficiaryName, nickname } = req.body;
  try {
    const account = await pool.query(
      `
        SELECT a.account_id
        FROM Accounts a
        JOIN Customers c ON c.customer_id = a.customer_id
        WHERE c.user_id = $1 AND a.account_number = $2
      `,
      [req.user.userId, accountNumber]
    );
    if (!account.rows[0]) return res.status(404).json({ message: "Owner account not found" });

    const result = await pool.query(
      `
        INSERT INTO Beneficiaries (account_id, beneficiary_account_number, beneficiary_name, nickname)
        VALUES ($1, $2, $3, $4)
        RETURNING beneficiary_id, beneficiary_account_number, beneficiary_name, nickname
      `,
      [account.rows[0].account_id, beneficiaryAccountNumber, beneficiaryName, nickname || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/beneficiaries/:beneficiaryId", async (req, res) => {
  const result = await pool.query(`DELETE FROM Beneficiaries WHERE beneficiary_id = $1`, [req.params.beneficiaryId]);
  return res.json({ deleted: result.rowCount });
});

router.get("/transactions", async (req, res) => {
  const result = await pool.query(
    `
      SELECT t.transaction_ref, t.transaction_type, t.amount, t.status, t.created_at
      FROM Transactions t
      JOIN Accounts a ON (a.account_id = t.from_account_id OR a.account_id = t.to_account_id)
      JOIN Customers c ON c.customer_id = a.customer_id
      WHERE c.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 200
    `,
    [req.user.userId]
  );
  const dedup = Object.values(
    result.rows.reduce((acc, row) => {
      acc[row.transaction_ref] = row;
      return acc;
    }, {})
  );
  return res.json(dedup);
});

router.get("/statement", async (req, res) => {
  const { accountNumber } = req.query;
  const result = await pool.query(
    `
      SELECT t.transaction_ref, t.transaction_type, t.amount, t.status, t.remarks, t.created_at
      FROM Transactions t
      JOIN Accounts a ON (a.account_id = t.from_account_id OR a.account_id = t.to_account_id)
      JOIN Customers c ON c.customer_id = a.customer_id
      WHERE c.user_id = $1 AND ($2::text IS NULL OR a.account_number = $2)
      ORDER BY t.created_at DESC
      LIMIT 500
    `,
    [req.user.userId, accountNumber || null]
  );
  const dedup = Object.values(
    result.rows.reduce((acc, row) => {
      acc[row.transaction_ref] = row;
      return acc;
    }, {})
  );
  return res.json({ statement: dedup });
});

router.get("/notifications", async (req, res) => {
  const result = await pool.query(
    `
      SELECT notification_id, title, message, is_read, created_at
      FROM Notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [req.user.userId]
  );
  return res.json(result.rows);
});

router.patch("/profile", async (req, res) => {
  const { fullName, phone } = req.body;
  const result = await pool.query(
    `
      UPDATE Users
      SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone)
      WHERE user_id = $3
      RETURNING user_id, full_name, email, phone
    `,
    [fullName || null, phone || null, req.user.userId]
  );
  return res.json(result.rows[0]);
});

router.patch("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await pool.query(`SELECT password_hash FROM Users WHERE user_id = $1`, [req.user.userId]);
  if (!user.rows[0]) return res.status(404).json({ message: "User not found" });

  const match = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
  if (!match) return res.status(400).json({ message: "Current password incorrect" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE Users SET password_hash = $1 WHERE user_id = $2`, [passwordHash, req.user.userId]);
  return res.json({ message: "Password updated successfully" });
});

module.exports = router;
