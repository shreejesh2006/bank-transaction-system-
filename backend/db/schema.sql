-- Bank Transaction System - PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'DISABLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('PENDING', 'ACTIVE', 'FROZEN', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
    CREATE TYPE kyc_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'BILLPAY', 'REVERSAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'ROLLED_BACK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS Roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(20) UNIQUE NOT NULL,
  description VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS Users (
  user_id BIGSERIAL PRIMARY KEY,
  role_id INT NOT NULL REFERENCES Roles(role_id),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  status user_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Branches (
  branch_id SERIAL PRIMARY KEY,
  branch_code VARCHAR(20) UNIQUE NOT NULL,
  branch_name VARCHAR(120) NOT NULL,
  city VARCHAR(80) NOT NULL,
  state VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Customers (
  customer_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  customer_code VARCHAR(30) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  kyc_status kyc_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Employees (
  employee_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  employee_code VARCHAR(30) UNIQUE NOT NULL,
  branch_id INT NOT NULL REFERENCES Branches(branch_id),
  designation VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Accounts (
  account_id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES Customers(customer_id),
  branch_id INT NOT NULL REFERENCES Branches(branch_id),
  account_number VARCHAR(20) UNIQUE NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('SAVINGS', 'CURRENT')),
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status account_status NOT NULL DEFAULT 'PENDING',
  approved_by BIGINT REFERENCES Users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Beneficiaries (
  beneficiary_id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES Accounts(account_id) ON DELETE CASCADE,
  beneficiary_account_number VARCHAR(20) NOT NULL,
  beneficiary_name VARCHAR(120) NOT NULL,
  nickname VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, beneficiary_account_number)
);

CREATE TABLE IF NOT EXISTS Transactions (
  transaction_id BIGSERIAL PRIMARY KEY,
  transaction_ref VARCHAR(30) UNIQUE NOT NULL DEFAULT ('TXN-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FOR 12))),
  transaction_type transaction_type NOT NULL,
  from_account_id BIGINT REFERENCES Accounts(account_id),
  to_account_id BIGINT REFERENCES Accounts(account_id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  status transaction_status NOT NULL DEFAULT 'INITIATED',
  remarks VARCHAR(255),
  initiated_by BIGINT REFERENCES Users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_transfer_accounts CHECK (
    (transaction_type = 'TRANSFER' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL) OR
    (transaction_type = 'DEPOSIT' AND from_account_id IS NULL AND to_account_id IS NOT NULL) OR
    (transaction_type = 'WITHDRAW' AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
    (transaction_type IN ('BILLPAY', 'REVERSAL'))
  )
);

CREATE TABLE IF NOT EXISTS TransactionLogs (
  log_id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES Transactions(transaction_id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS AuditLogs (
  audit_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES Users(user_id),
  action_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id VARCHAR(80),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS DemoScenarios (
  scenario_id SERIAL PRIMARY KEY,
  scenario_code VARCHAR(60) UNIQUE NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  dbms_concept VARCHAR(100) NOT NULL,
  expected_result TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS RecoveryLogs (
  recovery_id BIGSERIAL PRIMARY KEY,
  scenario_code VARCHAR(60),
  status VARCHAR(40) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS SystemStatus (
  status_id SERIAL PRIMARY KEY,
  component VARCHAR(80) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role_id);
CREATE INDEX IF NOT EXISTS idx_accounts_customer ON Accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON Transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON Transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON Transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLogs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_created ON RecoveryLogs(created_at DESC);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON Users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON Users
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON Customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON Customers
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON Employees;
CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON Employees
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_branches_updated_at ON Branches;
CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON Branches
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON Accounts;
CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON Accounts
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON Transactions;
CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON Transactions
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_prevent_frozen_account_transactions()
RETURNS TRIGGER AS $$
DECLARE
  src_status account_status;
  dst_status account_status;
BEGIN
  IF NEW.from_account_id IS NOT NULL THEN
    SELECT status INTO src_status FROM Accounts WHERE account_id = NEW.from_account_id;
    IF src_status = 'FROZEN' THEN
      RAISE EXCEPTION 'Source account is frozen';
    END IF;
  END IF;

  IF NEW.to_account_id IS NOT NULL THEN
    SELECT status INTO dst_status FROM Accounts WHERE account_id = NEW.to_account_id;
    IF dst_status = 'FROZEN' THEN
      RAISE EXCEPTION 'Destination account is frozen';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_frozen_transactions ON Transactions;
CREATE TRIGGER trg_prevent_frozen_transactions
BEFORE INSERT ON Transactions
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_frozen_account_transactions();

CREATE OR REPLACE VIEW v_customer_accounts AS
SELECT
  a.account_id,
  a.account_number,
  a.account_type,
  a.balance,
  a.status,
  c.customer_code,
  u.full_name AS customer_name,
  b.branch_code,
  b.branch_name
FROM Accounts a
JOIN Customers c ON c.customer_id = a.customer_id
JOIN Users u ON u.user_id = c.user_id
JOIN Branches b ON b.branch_id = a.branch_id;

CREATE OR REPLACE VIEW v_branch_performance AS
SELECT
  b.branch_code,
  b.branch_name,
  COUNT(DISTINCT a.account_id) AS total_accounts,
  COUNT(DISTINCT c.customer_id) AS total_customers,
  COALESCE(SUM(a.balance), 0)::NUMERIC(14,2) AS total_balance
FROM Branches b
LEFT JOIN Accounts a ON a.branch_id = b.branch_id
LEFT JOIN Customers c ON c.customer_id = a.customer_id
GROUP BY b.branch_code, b.branch_name;

CREATE OR REPLACE FUNCTION sp_deposit_funds(
  p_account_number VARCHAR,
  p_amount NUMERIC,
  p_initiated_by BIGINT,
  p_remarks VARCHAR DEFAULT 'Deposit'
)
RETURNS VARCHAR AS $$
DECLARE
  v_account_id BIGINT;
  v_txn_ref VARCHAR;
BEGIN
  SELECT account_id INTO v_account_id
  FROM Accounts
  WHERE account_number = p_account_number
  FOR UPDATE;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  UPDATE Accounts SET balance = balance + p_amount WHERE account_id = v_account_id;

  INSERT INTO Transactions(transaction_type, from_account_id, to_account_id, amount, status, remarks, initiated_by)
  VALUES ('DEPOSIT', NULL, v_account_id, p_amount, 'SUCCESS', p_remarks, p_initiated_by)
  RETURNING transaction_ref INTO v_txn_ref;

  RETURN v_txn_ref;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_withdraw_funds(
  p_account_number VARCHAR,
  p_amount NUMERIC,
  p_initiated_by BIGINT,
  p_remarks VARCHAR DEFAULT 'Withdraw'
)
RETURNS VARCHAR AS $$
DECLARE
  v_account_id BIGINT;
  v_balance NUMERIC;
  v_txn_ref VARCHAR;
BEGIN
  SELECT account_id, balance INTO v_account_id, v_balance
  FROM Accounts
  WHERE account_number = p_account_number
  FOR UPDATE;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE Accounts SET balance = balance - p_amount WHERE account_id = v_account_id;

  INSERT INTO Transactions(transaction_type, from_account_id, to_account_id, amount, status, remarks, initiated_by)
  VALUES ('WITHDRAW', v_account_id, NULL, p_amount, 'SUCCESS', p_remarks, p_initiated_by)
  RETURNING transaction_ref INTO v_txn_ref;

  RETURN v_txn_ref;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_transfer_funds(
  p_from_account VARCHAR,
  p_to_account VARCHAR,
  p_amount NUMERIC,
  p_initiated_by BIGINT,
  p_remarks VARCHAR DEFAULT 'Transfer'
)
RETURNS VARCHAR AS $$
DECLARE
  v_from_id BIGINT;
  v_to_id BIGINT;
  v_from_balance NUMERIC;
  v_txn_ref VARCHAR;
BEGIN
  IF p_from_account = p_to_account THEN
    RAISE EXCEPTION 'Sender and receiver accounts cannot be same';
  END IF;

  SELECT account_id, balance INTO v_from_id, v_from_balance
  FROM Accounts WHERE account_number = p_from_account FOR UPDATE;

  SELECT account_id INTO v_to_id
  FROM Accounts WHERE account_number = p_to_account FOR UPDATE;

  IF v_from_id IS NULL OR v_to_id IS NULL THEN
    RAISE EXCEPTION 'Invalid account number';
  END IF;

  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE Accounts SET balance = balance - p_amount WHERE account_id = v_from_id;
  UPDATE Accounts SET balance = balance + p_amount WHERE account_id = v_to_id;

  INSERT INTO Transactions(transaction_type, from_account_id, to_account_id, amount, status, remarks, initiated_by)
  VALUES ('TRANSFER', v_from_id, v_to_id, p_amount, 'SUCCESS', p_remarks, p_initiated_by)
  RETURNING transaction_ref INTO v_txn_ref;

  RETURN v_txn_ref;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW v_account_statement AS
SELECT
  a.account_number,
  t.transaction_ref,
  t.transaction_type,
  t.amount,
  t.status,
  t.remarks,
  t.created_at
FROM Transactions t
JOIN Accounts a ON (a.account_id = t.from_account_id OR a.account_id = t.to_account_id);

CREATE OR REPLACE FUNCTION fn_log_suspicious_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount >= 100000 THEN
    INSERT INTO TransactionLogs (transaction_id, event_type, description)
    VALUES (
      NEW.transaction_id,
      'ALERT',
      'Suspicious transaction threshold reached (>= 100000)'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_suspicious_transaction ON Transactions;
CREATE TRIGGER trg_log_suspicious_transaction
AFTER INSERT ON Transactions
FOR EACH ROW
EXECUTE FUNCTION fn_log_suspicious_transaction();

CREATE OR REPLACE FUNCTION sp_demo_atomicity_transfer(
  p_from_account VARCHAR,
  p_to_account VARCHAR,
  p_amount NUMERIC,
  p_initiated_by BIGINT,
  p_failure_stage VARCHAR DEFAULT 'NONE',
  p_scenario_code VARCHAR DEFAULT 'SCN_GENERIC'
)
RETURNS JSON AS $$
DECLARE
  v_from_id BIGINT;
  v_to_id BIGINT;
  v_from_balance NUMERIC;
  v_txn_ref VARCHAR;
  v_error TEXT;
BEGIN
  SELECT account_id, balance INTO v_from_id, v_from_balance
  FROM Accounts
  WHERE account_number = p_from_account
  FOR UPDATE;

  SELECT account_id INTO v_to_id
  FROM Accounts
  WHERE account_number = p_to_account
  FOR UPDATE;

  IF v_from_id IS NULL OR v_to_id IS NULL THEN
    RAISE EXCEPTION 'Invalid account numbers';
  END IF;

  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  BEGIN
    UPDATE Accounts SET balance = balance - p_amount WHERE account_id = v_from_id;

    IF p_failure_stage IN ('AFTER_DEBIT', 'SERVER_CRASH', 'NETWORK_DISCONNECT', 'DEVICE_SHUTDOWN') THEN
      RAISE EXCEPTION 'Simulated failure at stage: %', p_failure_stage;
    END IF;

    UPDATE Accounts SET balance = balance + p_amount WHERE account_id = v_to_id;

    INSERT INTO Transactions(
      transaction_type, from_account_id, to_account_id, amount, status, remarks, initiated_by
    ) VALUES (
      'TRANSFER', v_from_id, v_to_id, p_amount, 'SUCCESS',
      'Demo transfer success', p_initiated_by
    )
    RETURNING transaction_ref INTO v_txn_ref;

    INSERT INTO TransactionLogs (transaction_id, event_type, description)
    SELECT transaction_id, 'COMMIT', 'Demo transfer committed'
    FROM Transactions WHERE transaction_ref = v_txn_ref;

    RETURN json_build_object(
      'result', 'SUCCESS',
      'transaction_ref', v_txn_ref,
      'message', 'Transfer committed without failure'
    );
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;

      INSERT INTO RecoveryLogs (scenario_code, status, details)
      VALUES (p_scenario_code, 'ROLLED_BACK', v_error);

      RETURN json_build_object(
        'result', 'ROLLED_BACK',
        'failure_stage', p_failure_stage,
        'message', v_error
      );
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_demo_isolation_lock(
  p_account_number VARCHAR,
  p_add_amount NUMERIC,
  p_wait_seconds INT DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  v_account_id BIGINT;
  v_new_balance NUMERIC;
BEGIN
  SELECT account_id INTO v_account_id
  FROM Accounts
  WHERE account_number = p_account_number
  FOR UPDATE;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  PERFORM pg_sleep(p_wait_seconds);

  UPDATE Accounts
  SET balance = balance + p_add_amount
  WHERE account_id = v_account_id
  RETURNING balance INTO v_new_balance;

  RETURN json_build_object(
    'result', 'LOCKED_UPDATE_SUCCESS',
    'account_number', p_account_number,
    'new_balance', v_new_balance,
    'note', 'Lost update prevented using FOR UPDATE lock'
  );
END;
$$ LANGUAGE plpgsql;
