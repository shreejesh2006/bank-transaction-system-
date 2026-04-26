const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { writeAuditLog } = require("../middleware/audit");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/customers", async (req, res) => {
  const result = await pool.query(
    `
      SELECT u.user_id, u.full_name, u.email, u.status, c.customer_code, c.kyc_status
      FROM Users u
      JOIN Customers c ON c.user_id = u.user_id
      ORDER BY u.created_at DESC
    `
  );
  return res.json(result.rows);
});

router.post("/customers", async (req, res) => {
  const { fullName, email, phone, password, customerCode, address } = req.body;
  try {
    const role = await pool.query(`SELECT role_id FROM Roles WHERE role_name = 'CUSTOMER'`);
    if (!role.rows[0]) return res.status(400).json({ message: "Customer role not found" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `
        INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING user_id, full_name, email
      `,
      [role.rows[0].role_id, fullName, email, hashed, phone]
    );

    await pool.query(
      `
        INSERT INTO Customers (user_id, customer_code, address, kyc_status)
        VALUES ($1, $2, $3, 'PENDING')
      `,
      [user.rows[0].user_id, customerCode || `CUST-${Date.now()}`, address]
    );

    await writeAuditLog({
      userId: req.user.userId,
      actionType: "CREATE_CUSTOMER",
      entityType: "Customers",
      entityId: user.rows[0].user_id,
      metadata: user.rows[0]
    });

    return res.status(201).json(user.rows[0]);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/customers/search", async (req, res) => {
  const { q } = req.query;
  const result = await pool.query(
    `
      SELECT u.user_id, u.full_name, u.email, c.customer_code, a.account_number
      FROM Users u
      JOIN Customers c ON c.user_id = u.user_id
      LEFT JOIN Accounts a ON a.customer_id = c.customer_id
      WHERE u.full_name ILIKE $1 OR c.customer_code ILIKE $1 OR a.account_number ILIKE $1
      ORDER BY u.created_at DESC
      LIMIT 100
    `,
    [`%${q || ""}%`]
  );
  return res.json(result.rows);
});

router.get("/accounts", async (req, res) => {
  const result = await pool.query(`SELECT * FROM v_customer_accounts ORDER BY account_id DESC LIMIT 500`);
  return res.json(result.rows);
});

router.get("/branches", async (req, res) => {
  const result = await pool.query(`SELECT * FROM Branches ORDER BY branch_id`);
  return res.json(result.rows);
});

router.post("/branches", async (req, res) => {
  const { branchCode, branchName, city, state } = req.body;
  const result = await pool.query(
    `
      INSERT INTO Branches (branch_code, branch_name, city, state)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [branchCode, branchName, city, state]
  );
  return res.status(201).json(result.rows[0]);
});

router.get("/employees", async (req, res) => {
  const result = await pool.query(
    `
      SELECT e.employee_code, u.full_name, u.email, e.designation, b.branch_code, b.branch_name
      FROM Employees e
      JOIN Users u ON u.user_id = e.user_id
      JOIN Branches b ON b.branch_id = e.branch_id
      ORDER BY e.created_at DESC
    `
  );
  return res.json(result.rows);
});

router.get("/transactions", async (req, res) => {
  const result = await pool.query(
    `
      SELECT transaction_ref, transaction_type, amount, status, created_at
      FROM Transactions
      ORDER BY created_at DESC
      LIMIT 500
    `
  );
  return res.json(result.rows);
});

router.get("/transaction-logs", async (req, res) => {
  const result = await pool.query(
    `
      SELECT tl.log_id, t.transaction_ref, tl.event_type, tl.description, tl.log_time
      FROM TransactionLogs tl
      LEFT JOIN Transactions t ON t.transaction_id = tl.transaction_id
      ORDER BY tl.log_time DESC
      LIMIT 500
    `
  );
  return res.json(result.rows);
});

router.post("/employees", async (req, res) => {
  const { fullName, email, phone, password, branchCode } = req.body;
  try {
    const role = await pool.query(`SELECT role_id FROM Roles WHERE role_name = 'EMPLOYEE'`);
    const branch = await pool.query(`SELECT branch_id FROM Branches WHERE branch_code = $1`, [branchCode]);
    if (!role.rows[0] || !branch.rows[0]) {
      return res.status(400).json({ message: "Role or branch not found" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await pool.query(
      `
        INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING user_id, full_name, email
      `,
      [role.rows[0].role_id, fullName, email, passwordHash, phone]
    );

    await pool.query(
      `
        INSERT INTO Employees (user_id, employee_code, branch_id, designation)
        VALUES ($1, $2, $3, 'Operations Officer')
      `,
      [user.rows[0].user_id, `EMP-${Date.now()}`, branch.rows[0].branch_id]
    );

    await writeAuditLog({
      userId: req.user.userId,
      actionType: "CREATE_EMPLOYEE",
      entityType: "Employees",
      entityId: user.rows[0].user_id,
      metadata: user.rows[0]
    });

    return res.status(201).json(user.rows[0]);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/accounts", async (req, res) => {
  const { customerCode, accountType, openingBalance = 0, branchCode } = req.body;
  try {
    const customer = await pool.query(`SELECT customer_id FROM Customers WHERE customer_code = $1`, [customerCode]);
    const branch = await pool.query(`SELECT branch_id FROM Branches WHERE branch_code = $1`, [branchCode]);

    if (!customer.rows[0] || !branch.rows[0]) return res.status(404).json({ message: "Customer or branch not found" });

    const accountNumber = `10${Date.now().toString().slice(-10)}`;
    const result = await pool.query(
      `
        INSERT INTO Accounts (customer_id, branch_id, account_number, account_type, balance, status, approved_by)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
        RETURNING account_id, account_number, account_type, balance, status
      `,
      [
        customer.rows[0].customer_id,
        branch.rows[0].branch_id,
        accountNumber,
        accountType || "SAVINGS",
        openingBalance,
        req.user.userId
      ]
    );

    await pool.query(
      `
        INSERT INTO Notifications (user_id, title, message)
        SELECT c.user_id, 'Account Activated', 'Your bank account has been created and activated'
        FROM Customers c WHERE c.customer_id = $1
      `,
      [customer.rows[0].customer_id]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.patch("/accounts/:accountNumber/approve", async (req, res) => {
  const result = await pool.query(
    `
      UPDATE Accounts
      SET status = 'ACTIVE', approved_by = $1
      WHERE account_number = $2
      RETURNING account_number, status
    `,
    [req.user.userId, req.params.accountNumber]
  );
  return res.json(result.rows[0]);
});

router.patch("/customers/:customerCode/approve", async (req, res) => {
  const customer = await pool.query(
    `UPDATE Customers SET kyc_status = 'VERIFIED' WHERE customer_code = $1 RETURNING customer_id, customer_code`,
    [req.params.customerCode]
  );
  if (!customer.rows[0]) return res.status(404).json({ message: "Customer not found" });

  await writeAuditLog({
    userId: req.user.userId,
    actionType: "APPROVE_CUSTOMER",
    entityType: "Customers",
    entityId: customer.rows[0].customer_id,
    metadata: customer.rows[0]
  });
  return res.json(customer.rows[0]);
});

router.patch("/users/:userId/status", async (req, res) => {
  const { status } = req.body;
  const result = await pool.query(
    `UPDATE Users SET status = $1 WHERE user_id = $2 RETURNING user_id, email, status`,
    [status, req.params.userId]
  );
  return res.json(result.rows[0]);
});

router.patch("/accounts/:accountNumber/freeze", async (req, res) => {
  const { freeze } = req.body;
  const status = freeze ? "FROZEN" : "ACTIVE";
  const result = await pool.query(
    `UPDATE Accounts SET status = $1 WHERE account_number = $2 RETURNING account_number, status`,
    [status, req.params.accountNumber]
  );

  await pool.query(
    `
      INSERT INTO Notifications (user_id, title, message)
      SELECT c.user_id, $1, $2
      FROM Accounts a
      JOIN Customers c ON c.customer_id = a.customer_id
      WHERE a.account_number = $3
    `,
    [
      freeze ? "Account Frozen" : "Account Reactivated",
      freeze
        ? "Your account is frozen due to compliance review"
        : "Your account has been reactivated by the bank",
      req.params.accountNumber
    ]
  );

  await writeAuditLog({
    userId: req.user.userId,
    actionType: freeze ? "FREEZE_ACCOUNT" : "UNFREEZE_ACCOUNT",
    entityType: "Accounts",
    entityId: null,
    metadata: result.rows[0]
  });
  return res.json(result.rows[0]);
});

router.delete("/customers/:customerCode", async (req, res) => {
  const customer = await pool.query(`SELECT user_id FROM Customers WHERE customer_code = $1`, [req.params.customerCode]);
  if (!customer.rows[0]) return res.status(404).json({ message: "Customer not found" });
  await pool.query(`DELETE FROM Users WHERE user_id = $1`, [customer.rows[0].user_id]);
  return res.json({ message: "Customer deleted" });
});

router.delete("/employees/:employeeCode", async (req, res) => {
  const employee = await pool.query(`SELECT user_id FROM Employees WHERE employee_code = $1`, [req.params.employeeCode]);
  if (!employee.rows[0]) return res.status(404).json({ message: "Employee not found" });
  await pool.query(`DELETE FROM Users WHERE user_id = $1`, [employee.rows[0].user_id]);
  return res.json({ message: "Employee deleted" });
});

router.delete("/accounts/:accountNumber", async (req, res) => {
  const result = await pool.query(`DELETE FROM Accounts WHERE account_number = $1`, [req.params.accountNumber]);
  return res.json({ deleted: result.rowCount });
});

router.delete("/branches/:branchCode", async (req, res) => {
  const result = await pool.query(`DELETE FROM Branches WHERE branch_code = $1`, [req.params.branchCode]);
  return res.json({ deleted: result.rowCount });
});

router.get("/audit-logs", async (req, res) => {
  const result = await pool.query(
    `
      SELECT audit_id, user_id, action_type, entity_type, created_at
      FROM AuditLogs
      ORDER BY created_at DESC
      LIMIT 500
    `
  );
  return res.json(result.rows);
});

router.get("/reports/branches", async (req, res) => {
  const result = await pool.query(`SELECT * FROM v_branch_performance ORDER BY total_balance DESC`);
  return res.json(result.rows);
});

router.get("/settings/system-status", async (req, res) => {
  const result = await pool.query(`SELECT * FROM SystemStatus ORDER BY component`);
  return res.json(result.rows);
});

router.patch("/settings/system-status/:component", async (req, res) => {
  const { status, notes } = req.body;
  const result = await pool.query(
    `UPDATE SystemStatus SET status = $1, notes = $2, last_checked = NOW() WHERE component = $3 RETURNING *`,
    [status, notes || null, req.params.component]
  );
  return res.json(result.rows[0]);
});

router.get("/suspicious-transactions", async (req, res) => {
  const result = await pool.query(
    `
      SELECT transaction_ref, amount, status, remarks, created_at
      FROM Transactions
      WHERE amount >= 100000 OR status = 'FAILED'
      ORDER BY created_at DESC
      LIMIT 200
    `
  );
  return res.json(result.rows);
});

module.exports = router;
