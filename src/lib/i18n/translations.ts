export const locales = ["en", "tr", "es", "de", "fr"] as const;
export type Locale = (typeof locales)[number];
export type MsgKey =
  | "appName" | "login" | "register" | "pricing" | "donate" | "userAgreement" | "createAccount"
  | "heroTitle" | "heroSubtitle" | "notAuthority" | "checkEmail" | "resend" | "language";

export const messages: Record<Locale, Record<MsgKey, string>> = {
  en: { appName:"Join AI Religion", login:"Login", register:"Register", pricing:"View pricing", donate:"Donate", userAgreement:"Read user agreement", createAccount:"Create account", heroTitle:"Reflective simulation for symbolic self-discovery", heroSubtitle:"Fictional educational platform for reflective practice.", notAuthority:"Not a religious authority, medical care, psychological treatment, or crisis service.", checkEmail:"Check your email", resend:"Resend verification email", language:"Language" },
  tr: { appName:"Join AI Religion", login:"Giriş", register:"Kayıt", pricing:"Fiyatlar", donate:"Bağış", userAgreement:"Kullanıcı sözleşmesi", createAccount:"Hesap oluştur", heroTitle:"Sembolik öz keşif için yansıtıcı simülasyon", heroSubtitle:"Yansıtıcı pratik için kurgusal eğitim platformu.", notAuthority:"Dini otorite, tıbbi bakım, psikolojik tedavi veya kriz hizmeti değildir.", checkEmail:"E-postanı kontrol et", resend:"Doğrulama e-postasını yeniden gönder", language:"Dil" },
  es: { appName:"Join AI Religion", login:"Iniciar sesión", register:"Registrarse", pricing:"Ver precios", donate:"Donar", userAgreement:"Leer acuerdo de usuario", createAccount:"Crear cuenta", heroTitle:"Simulación reflexiva para autodescubrimiento simbólico", heroSubtitle:"Plataforma educativa ficticia para práctica reflexiva.", notAuthority:"No es autoridad religiosa, atención médica, tratamiento psicológico ni servicio de crisis.", checkEmail:"Revisa tu correo", resend:"Reenviar verificación", language:"Idioma" },
  de: { appName:"Join AI Religion", login:"Anmelden", register:"Registrieren", pricing:"Preise ansehen", donate:"Spenden", userAgreement:"Nutzungsvereinbarung", createAccount:"Konto erstellen", heroTitle:"Reflektive Simulation zur symbolischen Selbsterkundung", heroSubtitle:"Fiktive Bildungsplattform für reflektierende Praxis.", notAuthority:"Keine religiöse Autorität, medizinische Versorgung, psychologische Behandlung oder Krisenhilfe.", checkEmail:"E-Mail prüfen", resend:"Verifizierung erneut senden", language:"Sprache" },
  fr: { appName:"Join AI Religion", login:"Connexion", register:"S’inscrire", pricing:"Voir les tarifs", donate:"Faire un don", userAgreement:"Lire le contrat", createAccount:"Créer un compte", heroTitle:"Simulation réflexive pour l’auto‑découverte symbolique", heroSubtitle:"Plateforme éducative fictive pour la pratique réflexive.", notAuthority:"Ni autorité religieuse, ni soins médicaux, ni traitement psychologique, ni service de crise.", checkEmail:"Vérifiez votre e-mail", resend:"Renvoyer la vérification", language:"Langue" },
};

export function resolveLocale(input?: string | null): Locale {
  const n = (input || "en").toLowerCase().slice(0, 2);
  return (locales as readonly string[]).includes(n) ? (n as Locale) : "en";
}
