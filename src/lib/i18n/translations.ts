export const locales = ["en", "tr", "es", "de", "fr"] as const;
export type Locale = (typeof locales)[number];

export const messages: Record<Locale, Record<string, string>> = {
  en: { appName: "Join AI Religion", login: "Login", register: "Register", forgotPassword: "Forgot password?", language: "Language" },
  tr: { appName: "Join AI Religion", login: "Giriş", register: "Kayıt", forgotPassword: "Şifremi unuttum?", language: "Dil" },
  es: { appName: "Join AI Religion", login: "Iniciar sesión", register: "Registrarse", forgotPassword: "¿Olvidaste tu contraseña?", language: "Idioma" },
  de: { appName: "Join AI Religion", login: "Anmelden", register: "Registrieren", forgotPassword: "Passwort vergessen?", language: "Sprache" },
  fr: { appName: "Join AI Religion", login: "Connexion", register: "S’inscrire", forgotPassword: "Mot de passe oublié ?", language: "Langue" },
};

export function resolveLocale(input?: string | null): Locale {
  const normalized = (input || "en").toLowerCase().slice(0, 2);
  return (locales as readonly string[]).includes(normalized) ? (normalized as Locale) : "en";
}
