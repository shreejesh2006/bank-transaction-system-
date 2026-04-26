# Bank Transaction System

A full-stack, DBMS-first banking platform that simulates real-world digital banking operations for customers, admins, and employees while also providing an admin-controlled demo engine for ACID, rollback, concurrency, and crash-recovery scenarios.

## 1) Project Overview

The **Bank Transaction System** supports two tracks:

- **Real Banking Operations:** account lifecycle, deposits, withdrawals, transfers, beneficiary management, statements, approvals, freeze controls, analytics.
- **DBMS Demo Simulations:** controlled failure scenarios to demonstrate Atomicity, Consistency, Isolation, Durability, rollback, and recovery.

## 2) Problem Statement

Most student banking projects stop at simple CRUD and do not demonstrate transaction safety under failure conditions. This project solves that gap by combining practical banking workflows with explicit DBMS demonstrations that are viva/presentation-ready.

## 3) Objectives

- Build a professional banking system with role-based access.
- Enforce secure money movement using SQL transactions and row-level locking.
- Provide admin observability with audit logs, transaction logs, branch metrics, and suspicious activity reports.
- Deliver a demo panel to run predefined failure scenarios and inspect expected vs actual outcomes.

## 4) Feature List

### Real Banking

- Customer registration/login and profile management
- Account opening and admin approval/verification
- Deposit, withdrawal, transfer with ACID-safe operations
- Beneficiary add/remove
- Transaction history and statement endpoints
- Notifications and audit events

### Admin Controls

- Customer/employee/account creation and management
- KYC/account approval, freeze/unfreeze operations
- Search and monitoring of transactions
- Branch performance and report endpoints
- Audit and recovery logs access

### Employee (supported)

- Employee identity model and role access
- Can be extended for KYC/branch workflows

### Demo Engine

- Admin-only scenario execution
- Failure injection, rollback, recovery logging
- Concurrency/lost-update prevention demo

## 5) Tech Stack

- **Frontend:** HTML, CSS, JavaScript (multi-page UI)
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (SQL, views, triggers, functions)
- **Auth:** JWT + bcrypt password hashing
- **Authorization:** Role-based middleware

## 6) System Architecture

- **Presentation Layer:** Static banking UI pages (`frontend/`)
- **API Layer:** Express REST API (`backend/src/routes`)
- **Service Layer:** Transaction-safe business logic (`backend/src/services`)
- **Data Layer:** PostgreSQL schema, indexes, triggers, views, stored procedures (`backend/db`)
- **Observability:** `AuditLogs`, `TransactionLogs`, `RecoveryLogs`

## 7) Database Schema (SQL)

See `backend/db/schema.sql` for complete DDL including:

- Required tables: `Users`, `Roles`, `Customers`, `Employees`, `Branches`, `Accounts`, `Beneficiaries`, `Transactions`, `TransactionLogs`, `AuditLogs`, `Notifications`, `DemoScenarios`, `RecoveryLogs`, `SystemStatus`
- Constraints, foreign keys, checks, indexes
- Views: `v_customer_accounts`, `v_branch_performance`
- Triggers: `updated_at` maintenance, frozen-account protection
- Stored procedures/functions: `sp_transfer_funds`, `sp_deposit_funds`, `sp_withdraw_funds`

## 8) ER Diagram

See `docs/ERD.md` (Mermaid ER diagram).

## 9) API Design

See `docs/API.md` for role-based endpoints and sample payloads.

## 10) Frontend Page Structure

See `frontend/` for modern banking pages:

- `index.html` (login/signup)
- `admin.html`, `customer.html`, `employee.html`
- `create-account.html`, `account-overview.html`
- `deposit.html`, `withdraw.html`, `transfer.html`, `beneficiary.html`
- `transactions.html`, `reports.html`, `audit-logs.html`
- `demo-panel.html`, `recovery-logs.html`, `settings.html`

## 11) Backend Folder Structure

See section in `docs/PROJECT_STRUCTURE.md`.

## 12) SQL Table Scripts

- `backend/db/schema.sql`
- `backend/db/sample_data.sql`

## 13) Sample Data

Seed roles, branches, demo scenarios, and initial users in `backend/db/sample_data.sql`.

## 14) Functional Workflow

1. Customer registers
2. Admin/employee verifies and approves account
3. Customer performs deposit/withdraw/transfer
4. System logs all actions and transaction events
5. Admin monitors reports, suspicious activity, and audit logs

## 15) Real Banking Scenarios Included

- Account opening and approval
- Salary deposit
- Withdrawal
- Transfer to beneficiary
- Statement retrieval
- Account freeze for suspicious behavior
- Admin transaction review
- Branch performance analysis

## 16) Demo Scenarios Included (Admin Controlled)

Mapped to your required 7 scenarios via `DemoScenarios` + `POST /api/demo/run/:code`.

- Device shutdown mid-transfer
- Server crash during transaction
- Network disconnection
- Lost update (concurrency control)
- ATM failure
- Interrupted bill payment
- System crash & recovery

Each run writes into `RecoveryLogs` and `TransactionLogs`.

## 17) Recovery Flow

- Incomplete operations are aborted by SQL transaction boundaries.
- Raised exceptions rollback debit-before-credit failures.
- Recovery entries persist to `RecoveryLogs` for forensic review.
- Locking with `FOR UPDATE` prevents concurrent lost updates.

## 18) Future Enhancements

- Two-factor authentication and device fingerprinting
- Real-time alerts via email/SMS/WebSocket
- AML rule engine with risk scoring
- Multi-currency ledger and FX rates
- Docker/Kubernetes deployment and CI pipelines

---

## Run Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Setup

1. Create database (example: `bank_txn_system`).
2. Run SQL scripts:
   - `backend/db/schema.sql`
   - `backend/db/sample_data.sql`
3. Configure environment:
   - Copy `backend/.env.example` to `backend/.env`
4. Start backend:

```bash
cd backend
npm install
npm run dev
```

5. Open frontend pages directly in browser (or serve `frontend/` via any static server).

### Demo Admin Credentials (seed)

- Email: `admin@bank.local`
- Password: `Admin@123`
