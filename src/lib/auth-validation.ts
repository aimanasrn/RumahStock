import { z } from "zod";

const password = z.string().min(8, "Use at least 8 characters").max(128);
const next = z
  .string()
  .regex(/^\/onboarding\?token=[a-f0-9]{64}$/)
  .optional();
const confirmedPassword = { password, confirm: z.string().min(1, "Confirm your password") };

export const authSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("login"), email: z.email(), password, next }),
  z
    .object({
      kind: z.literal("register"),
      email: z.email(),
      name: z.string().trim().min(1).max(100),
      ...confirmedPassword,
      next,
    })
    .refine((v) => v.password === v.confirm, {
      path: ["confirm"],
      message: "Passwords do not match",
    }),
  z.object({ kind: z.literal("forgot-password"), email: z.email() }),
  z
    .object({ kind: z.literal("reset-password"), ...confirmedPassword })
    .refine((v) => v.password === v.confirm, {
      path: ["confirm"],
      message: "Passwords do not match",
    }),
]);
