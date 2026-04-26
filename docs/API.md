# REST API Design

Base URL: `http://localhost:5000/api`

## Authentication

- `POST /auth/register`
- `POST /auth/login`

## Customer APIs (role: CUSTOMER)

- `GET /customer/profile`
- `GET /customer/accounts`
- `POST /customer/deposit`
- `POST /customer/withdraw`
- `POST /customer/transfer`
- `POST /customer/beneficiaries`
- `DELETE /customer/beneficiaries/:beneficiaryId`
- `GET /customer/transactions`

## Admin APIs (role: ADMIN)

- `GET /admin/customers`
- `GET /admin/accounts`
- `GET /admin/transactions`
- `POST /admin/employees`
- `POST /admin/accounts`
- `PATCH /admin/accounts/:accountNumber/freeze`
- `GET /admin/audit-logs`
- `GET /admin/reports/branches`
- `GET /admin/suspicious-transactions`

## Employee APIs (role: EMPLOYEE/ADMIN)

- `GET /employee/branch-customers`
- `PATCH /employee/customers/:customerCode/kyc`
- `GET /employee/reports/branch`

## Demo APIs (role: ADMIN)

- `GET /demo/scenarios`
- `POST /demo/run/:code`
- `POST /demo/reset`
- `GET /demo/recovery-logs`

## Sample Transfer Payload

```json
{
  "fromAccountNumber": "100000000001",
  "toAccountNumber": "100000000002",
  "amount": 5000,
  "remarks": "Monthly rent"
}
```
