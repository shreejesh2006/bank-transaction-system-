const { z } = require("zod");

const registerSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(10),
  address: z.string().min(5),
  role: z.enum(["CUSTOMER", "EMPLOYEE"]).default("CUSTOMER")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const moneySchema = z.object({
  accountNumber: z.string().min(8),
  amount: z.number().positive(),
  remarks: z.string().max(255).optional()
});

const transferSchema = z.object({
  fromAccountNumber: z.string().min(8),
  toAccountNumber: z.string().min(8),
  amount: z.number().positive(),
  remarks: z.string().max(255).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  moneySchema,
  transferSchema
};
