const { pool } = require("../config/db");

async function writeAuditLog({ userId, actionType, entityType, entityId, metadata }) {
  await pool.query(
    `
      INSERT INTO AuditLogs (user_id, action_type, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [userId || null, actionType, entityType || null, entityId || null, metadata || null]
  );
}

module.exports = {
  writeAuditLog
};
