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
  CREDIT_PURCHASES_ENABLED: readEnv("CREDIT_PURCHASES_ENABLED"),
  STRIPE_PRICE_AI_CREDIT_PACK: readEnv("STRIPE_PRICE_AI_CREDIT_PACK"),
  ADMIN_EMAILS: readEnv("ADMIN_EMAILS"),
  INTERNAL_AGENT_API_KEY: readEnv("INTERNAL_AGENT_API_KEY"),
  EMAIL_FROM: readEnv("EMAIL_FROM"),
  CRON_SECRET: readEnv("CRON_SECRET"),
  EMAIL_SENDING_ENABLED: readEnv("EMAIL_SENDING_ENABLED"), // set to "true" to enable live sending
  PRACTICE_GENERATION_MODE: readEnv("PRACTICE_GENERATION_MODE"), // "openai" to use AI generation; default is placeholder
  SOCIAL_LISTENING_ENABLED: readEnv("SOCIAL_LISTENING_ENABLED"),
  SOCIAL_PUBLISHING_ENABLED: readEnv("SOCIAL_PUBLISHING_ENABLED"),
  MASTODON_BASE_URL: readEnv("MASTODON_BASE_URL"),
  MASTODON_ACCESS_TOKEN: readEnv("MASTODON_ACCESS_TOKEN"),
  X_BEARER_TOKEN: readEnv("X_BEARER_TOKEN"),
  X_USER_ACCESS_TOKEN: readEnv("X_USER_ACCESS_TOKEN"),
  LINKEDIN_ACCESS_TOKEN: readEnv("LINKEDIN_ACCESS_TOKEN"),
  LINKEDIN_AUTHOR_URN: readEnv("LINKEDIN_AUTHOR_URN"),
  LINKEDIN_VERSION: readEnv("LINKEDIN_VERSION"),
  BLUESKY_SERVICE_URL: readEnv("BLUESKY_SERVICE_URL"),
  BLUESKY_IDENTIFIER: readEnv("BLUESKY_IDENTIFIER"),
  BLUESKY_APP_PASSWORD: readEnv("BLUESKY_APP_PASSWORD"),
};

export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
