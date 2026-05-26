function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (!value || value.trim() === "") return undefined;
  return value;
}

export const env = {
  DATABASE_URL: readEnv("DATABASE_URL"),
  OPENAI_API_KEY: readEnv("OPENAI_API_KEY"),
  STRIPE_SECRET_KEY: readEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: readEnv("STRIPE_WEBHOOK_SECRET"),
  RESEND_API_KEY: readEnv("RESEND_API_KEY"),
  NEXT_PUBLIC_APP_URL: readEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_PRICE_SEEKER_MONTHLY: readEnv("STRIPE_PRICE_SEEKER_MONTHLY"),
  STRIPE_PRICE_INITIATE_MONTHLY: readEnv("STRIPE_PRICE_INITIATE_MONTHLY"),
};

export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
