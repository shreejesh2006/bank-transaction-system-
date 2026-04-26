const { pool } = require("../config/db");

async function logRecovery({ scenarioCode, status, details }) {
  await pool.query(
    `
      INSERT INTO RecoveryLogs (scenario_code, status, details)
      VALUES ($1, $2, $3)
    `,
    [scenarioCode, status, details]
  );
}

async function runScenario(code, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const scenario = await client.query(
      `SELECT scenario_code, title, dbms_concept FROM DemoScenarios WHERE scenario_code = $1`,
      [code]
    );
    if (!scenario.rows[0]) throw new Error("Scenario not found");

    const sc = scenario.rows[0];
    let expectedResult = sc.expected_result;
    let actualResult = "Scenario executed";
    let dbResponse = null;

    if (code === "SCN_DB_LOCK_LOST_UPDATE") {
      const lockRun = await client.query(
        `SELECT sp_demo_isolation_lock('100000000001', 1, 1) AS result`
      );
      dbResponse = lockRun.rows[0].result;
      actualResult = "Row-level lock applied; lost update avoided";
    } else if (
      code === "SCN_SERVER_CRASH_TRANSFER" ||
      code === "SCN_DEVICE_SHUTDOWN" ||
      code === "SCN_NETWORK_DISCONNECT" ||
      code === "SCN_BILLPAY_INTERRUPTED" ||
      code === "SCN_ATM_FAILURE" ||
      code === "SCN_SYSTEM_CRASH_RECOVERY"
    ) {
      const failureMap = {
        SCN_SERVER_CRASH_TRANSFER: "SERVER_CRASH",
        SCN_DEVICE_SHUTDOWN: "DEVICE_SHUTDOWN",
        SCN_NETWORK_DISCONNECT: "NETWORK_DISCONNECT",
        SCN_BILLPAY_INTERRUPTED: "AFTER_DEBIT",
        SCN_ATM_FAILURE: "AFTER_DEBIT",
        SCN_SYSTEM_CRASH_RECOVERY: "SERVER_CRASH"
      };

      const demoRun = await client.query(
        `SELECT sp_demo_atomicity_transfer('100000000001', '100000000002', 1, $1, $2, $3) AS result`,
        [userId, failureMap[code], code]
      );

      dbResponse = demoRun.rows[0].result;
      actualResult = dbResponse.message || "Rollback/recovery simulation executed";
    }

    await client.query(
      `
        INSERT INTO AuditLogs (user_id, action_type, entity_type, entity_id, metadata)
        VALUES ($1, 'DEMO_RUN', 'DemoScenarios', NULL, $2)
      `,
      [userId, JSON.stringify({ scenarioCode: code, expectedResult, actualResult, dbResponse })]
    );

    await client.query("COMMIT");
    await logRecovery({
      scenarioCode: code,
      status: "RECOVERED",
      details: `${sc.title}: ${actualResult}`
    });

    return {
      scenarioCode: code,
      title: sc.title,
      concept: sc.dbms_concept,
      expectedResult,
      actualResult,
      dbResponse
    };
  } catch (error) {
    await client.query("ROLLBACK");
    await logRecovery({
      scenarioCode: code,
      status: "ROLLED_BACK",
      details: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  runScenario
};
