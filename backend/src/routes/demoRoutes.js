const express = require("express");
const { pool } = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { runScenario } = require("../services/demoService");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/scenarios", async (req, res) => {
  const result = await pool.query(
    `SELECT scenario_code, title, description, dbms_concept, expected_result FROM DemoScenarios ORDER BY scenario_id`
  );
  return res.json(result.rows);
});

router.post("/run/:code", async (req, res) => {
  try {
    const result = await runScenario(req.params.code, req.user.userId);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/reset", async (req, res) => {
  await pool.query(`DELETE FROM RecoveryLogs WHERE scenario_code IS NOT NULL`);
  return res.json({ message: "Demo state reset complete" });
});

router.get("/recovery-logs", async (req, res) => {
  const result = await pool.query(
    `
      SELECT recovery_id, scenario_code, status, details, created_at
      FROM RecoveryLogs
      ORDER BY created_at DESC
      LIMIT 300
    `
  );
  return res.json(result.rows);
});

module.exports = router;
