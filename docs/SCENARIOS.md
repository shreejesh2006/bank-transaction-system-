# Real Banking Scenarios (Actual Use Cases)

1. **Customer opens account**
   - Register with profile details.
   - Admin creates bank account for verified customer.

2. **Admin approves account**
   - `PATCH /api/admin/customers/:customerCode/approve`
   - `PATCH /api/admin/accounts/:accountNumber/approve`

3. **Customer deposits salary**
   - `POST /api/customer/deposit`

4. **Customer withdraws money**
   - `POST /api/customer/withdraw`

5. **Customer transfers funds**
   - `POST /api/customer/transfer`

6. **Customer adds beneficiary**
   - `POST /api/customer/beneficiaries`

7. **Customer downloads statement**
   - `GET /api/customer/statement`

8. **Admin freezes suspicious account**
   - `PATCH /api/admin/accounts/:accountNumber/freeze`

9. **Admin checks transaction logs**
   - `GET /api/admin/transaction-logs`

10. **Branch performance monitoring**
   - `GET /api/admin/reports/branches`

---

# DBMS Demo Scenarios (Admin Controlled)

Run through Demo Panel or API `POST /api/demo/run/:code`.

1. `SCN_DEVICE_SHUTDOWN`
   - Concept: Atomicity
   - Result: no partial transfer

2. `SCN_SERVER_CRASH_TRANSFER`
   - Concept: Atomicity + Recovery
   - Result: rollback restores sender state

3. `SCN_NETWORK_DISCONNECT`
   - Concept: Atomicity + Failure Handling
   - Result: safe cancel, no duplicate debit

4. `SCN_DB_LOCK_LOST_UPDATE`
   - Concept: Isolation / Concurrency Control
   - Result: row lock prevents lost update

5. `SCN_ATM_FAILURE`
   - Concept: Consistency
   - Result: rollback/recovery keeps ledger consistent

6. `SCN_BILLPAY_INTERRUPTED`
   - Concept: Atomicity
   - Result: payment cancelled or rolled back

7. `SCN_SYSTEM_CRASH_RECOVERY`
   - Concept: Durability + Recovery
   - Result: uncommitted state rolled back during recovery
