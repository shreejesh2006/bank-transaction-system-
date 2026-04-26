-- Sample data for Bank Transaction System

INSERT INTO Roles (role_name, description)
VALUES
  ('ADMIN', 'System administrator with full banking control'),
  ('CUSTOMER', 'Bank customer with account access'),
  ('EMPLOYEE', 'Bank operations employee')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO Branches (branch_code, branch_name, city, state)
VALUES
  ('BR001', 'Central Banking Hub', 'Bengaluru', 'Karnataka'),
  ('BR002', 'North Financial Center', 'Delhi', 'Delhi NCR'),
  ('BR003', 'West Coast Banking', 'Mumbai', 'Maharashtra')
ON CONFLICT (branch_code) DO NOTHING;

INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
SELECT role_id, 'System Admin', 'admin@bank.local', '$2a$10$YkBWP11xXctCxM9AstREVOJRaOXFRytbJaHk7IDBVKpoIfdUqfMiG', '9000000001', 'ACTIVE'
FROM Roles WHERE role_name = 'ADMIN'
ON CONFLICT (email) DO NOTHING;

INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
SELECT role_id, 'Priya Sharma', 'customer1@bank.local', '$2a$10$YkBWP11xXctCxM9AstREVOJRaOXFRytbJaHk7IDBVKpoIfdUqfMiG', '9000000002', 'ACTIVE'
FROM Roles WHERE role_name = 'CUSTOMER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
SELECT role_id, 'Rahul Verma', 'employee1@bank.local', '$2a$10$YkBWP11xXctCxM9AstREVOJRaOXFRytbJaHk7IDBVKpoIfdUqfMiG', '9000000003', 'ACTIVE'
FROM Roles WHERE role_name = 'EMPLOYEE'
ON CONFLICT (email) DO NOTHING;

INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
SELECT role_id, 'Aisha Khan', 'customer2@bank.local', '$2a$10$YkBWP11xXctCxM9AstREVOJRaOXFRytbJaHk7IDBVKpoIfdUqfMiG', '9000000004', 'ACTIVE'
FROM Roles WHERE role_name = 'CUSTOMER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO Users (role_id, full_name, email, password_hash, phone, status)
SELECT role_id, 'Vikram Iyer', 'customer3@bank.local', '$2a$10$YkBWP11xXctCxM9AstREVOJRaOXFRytbJaHk7IDBVKpoIfdUqfMiG', '9000000005', 'ACTIVE'
FROM Roles WHERE role_name = 'CUSTOMER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO Customers (user_id, customer_code, address, kyc_status)
SELECT u.user_id, 'CUST-1001', 'Indiranagar, Bengaluru', 'VERIFIED'
FROM Users u
WHERE u.email = 'customer1@bank.local'
ON CONFLICT (customer_code) DO NOTHING;

INSERT INTO Customers (user_id, customer_code, address, kyc_status)
SELECT u.user_id, 'CUST-1002', 'HSR Layout, Bengaluru', 'VERIFIED'
FROM Users u
WHERE u.email = 'customer2@bank.local'
ON CONFLICT (customer_code) DO NOTHING;

INSERT INTO Customers (user_id, customer_code, address, kyc_status)
SELECT u.user_id, 'CUST-1003', 'Koramangala, Bengaluru', 'VERIFIED'
FROM Users u
WHERE u.email = 'customer3@bank.local'
ON CONFLICT (customer_code) DO NOTHING;

INSERT INTO Employees (user_id, employee_code, branch_id, designation)
SELECT u.user_id, 'EMP-2001', b.branch_id, 'KYC Officer'
FROM Users u
JOIN Branches b ON b.branch_code = 'BR001'
WHERE u.email = 'employee1@bank.local'
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO Accounts (customer_id, branch_id, account_number, account_type, balance, status)
SELECT c.customer_id, b.branch_id, '100000000001', 'SAVINGS', 150000.00, 'ACTIVE'
FROM Customers c
JOIN Branches b ON b.branch_code = 'BR001'
WHERE c.customer_code = 'CUST-1001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO Accounts (customer_id, branch_id, account_number, account_type, balance, status)
SELECT c.customer_id, b.branch_id, '100000000002', 'SAVINGS', 50000.00, 'ACTIVE'
FROM Customers c
JOIN Branches b ON b.branch_code = 'BR001'
WHERE c.customer_code = 'CUST-1001'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO Accounts (customer_id, branch_id, account_number, account_type, balance, status)
SELECT c.customer_id, b.branch_id, '100000000003', 'SAVINGS', 82000.00, 'ACTIVE'
FROM Customers c
JOIN Branches b ON b.branch_code = 'BR002'
WHERE c.customer_code = 'CUST-1002'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO Accounts (customer_id, branch_id, account_number, account_type, balance, status)
SELECT c.customer_id, b.branch_id, '100000000004', 'CURRENT', 245000.00, 'ACTIVE'
FROM Customers c
JOIN Branches b ON b.branch_code = 'BR003'
WHERE c.customer_code = 'CUST-1003'
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO DemoScenarios (scenario_code, title, description, dbms_concept, expected_result)
VALUES
  ('SCN_DEVICE_SHUTDOWN', 'Device Shuts Down Mid-Transfer', 'Phone battery dies during transfer', 'Atomicity', 'Transaction fails safely with no partial debit/credit'),
  ('SCN_SERVER_CRASH_TRANSFER', 'Server Crash During Transaction', 'Server crashes after sender debit before receiver credit', 'Atomicity + Recovery', 'Rollback restores sender balance'),
  ('SCN_NETWORK_DISCONNECT', 'Network Disconnection', 'Internet disconnects while submitting transfer', 'Atomicity + Failure Handling', 'No duplicate debit and safe cancellation'),
  ('SCN_DB_LOCK_LOST_UPDATE', 'Database Locked (Lost Update)', 'Two users update same account simultaneously', 'Isolation / Concurrency Control', 'One waits, no lost update'),
  ('SCN_ATM_FAILURE', 'ATM Failure', 'ATM cash dispense succeeds but confirmation fails', 'Consistency', 'Rollback/recovery ensures consistency'),
  ('SCN_BILLPAY_INTERRUPTED', 'Interrupted Bill Payment', 'Power cut during bill payment', 'Atomicity', 'Cancelled or rolled back safely'),
  ('SCN_SYSTEM_CRASH_RECOVERY', 'System Crash & Recovery', 'System crashes before commit', 'Durability + Recovery', 'Uncommitted transaction rolled back during recovery')
ON CONFLICT (scenario_code) DO NOTHING;

INSERT INTO SystemStatus (component, status, notes)
VALUES
  ('API', 'UP', 'Express API healthy'),
  ('DATABASE', 'UP', 'PostgreSQL connected'),
  ('DEMO_ENGINE', 'UP', 'Demo scenarios operational')
ON CONFLICT (component) DO NOTHING;
