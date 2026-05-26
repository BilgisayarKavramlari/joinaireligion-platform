type EnvKey =
  | "DATABASE_URL"
  | "OPENAI_API_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "RESEND_API_KEY"
  | "NEXT_PUBLIC_APP_URL";

const requiredEnv: EnvKey[] = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL as string,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY as string,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
  RESEND_API_KEY: process.env.RESEND_API_KEY as string,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL as string,
};
