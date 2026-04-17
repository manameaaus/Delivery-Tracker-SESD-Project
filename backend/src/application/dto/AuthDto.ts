import { z } from "zod";

export const signInSchema = z.object({
  identifier: z.string().min(3).max(120),
  password: z.string()
});

export type SignInInput = z.infer<typeof signInSchema>;

