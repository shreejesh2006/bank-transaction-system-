const { pool } = require("../config/db");

async function resolveAccount(client, accountNumber) {
  const result = await client.query(
    `SELECT account_id, balance, status FROM Accounts WHERE account_number = $1 FOR UPDATE`,
    [accountNumber]
  );
  return result.rows[0];
}

async function deposit({ accountNumber, amount, initiatedBy, remarks = "Deposit" }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const account = await resolveAccount(client, accountNumber);
    if (!account) throw new Error("Account not found");
    if (account.status !== "ACTIVE") throw new Error("Account not active");

    const newBalance = Number(account.balance) + Number(amount);
    await client.query(`UPDATE Accounts SET balance = $1 WHERE account_id = $2`, [newBalance, account.account_id]);

    const txn = await client.query(
      `
        INSERT INTO Transactions (
          transaction_type, from_account_id, to_account_id, amount, status, remarks, initiated_by
        ) VALUES ('DEPOSIT', NULL, $1, $2, 'SUCCESS', $3, $4)
        RETURNING transaction_id, transaction_ref
      `,
      [account.account_id, amount, remarks, initiatedBy]
    );

    await client.query(
      `
        INSERT INTO TransactionLogs (transaction_id, event_type, description)
        VALUES ($1, 'COMMIT', 'Deposit committed successfully')
      `,
      [txn.rows[0].transaction_id]
    );

    await client.query("COMMIT");
    return { ...txn.rows[0], newBalance };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function withdraw({ accountNumber, amount, initiatedBy, remarks = "Withdraw" }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const account = await resolveAccount(client, accountNumber);
    if (!account) throw new Error("Account not found");
    if (account.status !== "ACTIVE") throw new Error("Account not active");
    if (Number(account.balance) < Number(amount)) throw new Error("Insufficient balance");

    const newBalance = Number(account.balance) - Number(amount);
    await client.query(`UPDATE Accounts SET balance = $1 WHERE account_id = $2`, [newBalance, account.account_id]);

    const txn = await client.query(
      `
        INSERT INTO Transactions (
          transaction_type, from_account_id, to_account_id, amount, status, remarks, initiated_by
        ) VALUES ('WITHDRAW', $1, NULL, $2, 'SUCCESS', $3, $4)
        RETURNING transaction_id, transaction_ref
      `,
      [account.account_id, amount, remarks, initiatedBy]
    );

    await client.query(
      `
        INSERT INTO TransactionLogs (transaction_id, event_type, description)
        VALUES ($1, 'COMMIT', 'Withdrawal committed successfully')
      `,
      [txn.rows[0].transaction_id]
    );

    await client.query("COMMIT");
    return { ...txn.rows[0], newBalance };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function transfer({ fromAccountNumber, toAccountNumber, amount, initiatedBy, remarks = "Transfer" }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (fromAccountNumber === toAccountNumber) throw new Error("Cannot transfer to same account");

    const from = await resolveAccount(client, fromAccountNumber);
    const to = await resolveAccount(client, toAccountNumber);

    if (!from || !to) throw new Error("Invalid accounts");
    if (from.status !== "ACTIVE" || to.status !== "ACTIVE") throw new Error("Account not active");
    if (Number(from.balance) < Number(amount)) throw new Error("Insufficient balance");

    await client.query(`UPDATE Accounts SET balance = balance - $1 WHERE account_id = $2`, [amount, from.account_id]);
    await client.query(`UPDATE Accounts SET balance = balance + $1 WHERE account_id = $2`, [amount, to.account_id]);

    const txn = await client.query(
      `
        INSERT INTO Transactions (
          transaction_type, from_account_id, to_account_id, amount, status, remarks, initiated_by
        ) VALUES ('TRANSFER', $1, $2, $3, 'SUCCESS', $4, $5)
        RETURNING transaction_id, transaction_ref
      `,
      [from.account_id, to.account_id, amount, remarks, initiatedBy]
    );

    await client.query(
      `
        INSERT INTO TransactionLogs (transaction_id, event_type, description)
        VALUES ($1, 'COMMIT', 'Transfer committed successfully')
      `,
      [txn.rows[0].transaction_id]
    );

    await client.query("COMMIT");
    return txn.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  deposit,
  withdraw,
  transfer
};
