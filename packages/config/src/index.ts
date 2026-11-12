import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  WECHAT_APP_ID: z.string().default(""),
  WECHAT_APP_SECRET: z.string().default(""),
  WCL_CLIENT_ID: z.string().default(""),
  WCL_CLIENT_SECRET: z.string().default(""),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, string | undefined>): AppEnv {
  return envSchema.parse(input);
}
