# Functional Workflow

## A) Customer Banking Workflow

1. User registers from login page.
2. Customer record is created with KYC as `PENDING`.
3. Admin/Employee verifies KYC and approves customer.
4. Admin creates bank account and sets status `ACTIVE`.
5. Customer performs deposit, withdrawal, transfer.
6. Every operation writes transaction and audit logs.
7. Notifications are generated for key events.
8. Customer downloads statement from transaction page.

## B) Admin Workflow

1. Admin logs in and opens dashboard.
2. Reviews customers/accounts/transactions.
3. Freezes suspicious accounts when needed.
4. Reviews branch performance and suspicious transactions.
5. Reviews audit logs and transaction logs.
6. Runs demo scenarios and validates recovery logs.

## C) Employee Workflow

1. Employee logs in.
2. Reviews branch customers.
3. Updates KYC status to `VERIFIED/REJECTED`.
4. Generates branch-level report.
