"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LangCode } from "@/lib/i18n/dict";

type PrivacyCopy = {
  eyebrow: string;
  title: string;
  effective: string;
  intro: string;
  englishNotice: string;
  sections: Array<{ title: string; body: string[]; bullets?: string[] }>;
  contactTitle: string;
  contactBody: string;
  backHome: string;
  readEula: string;
};

const EFFECTIVE_DATE = "July 29, 2026";

const privacyCopy = {
  en: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    effective: `Effective: ${EFFECTIVE_DATE} · Version 1.0`,
    intro:
      "This policy explains what Join AI Religion collects, why it is used, and the boundaries that apply to private journals, practice check-ins, reflective submissions, and AI features.",
    englishNotice:
      "Translations are provided for accessibility. If a translation conflicts with the English version, the English version controls, subject to applicable law.",
    sections: [
      {
        title: "1. Information we collect",
        body: [
          "We collect information you provide, information required to operate your account, and limited technical records needed to keep the service secure and reliable.",
        ],
        bullets: [
          "Account and profile data, such as email address, display name, language, timezone, and optional onboarding answers, which may include a religious or philosophical worldview.",
          "Service data, such as lesson progress, practice schedules, check-ins, durations, support requests, and the text you intentionally submit in a guided reflection or AI conversation.",
          "Operational data, such as timestamps, security events, device or browser information, and hashed rather than raw IP addresses where IP-derived records are needed.",
          "Billing status and transaction references from Stripe. We do not store full payment-card details.",
        ],
      },
      {
        title: "2. Private journals and practice data",
        body: [
          "Personal journal entries, private practice notes, routine schedules, and check-ins are private account data. They are not public posts and are not used for advertising, SEO, social-media publishing, or public content generation.",
          "Before private journal or private-note features are enabled, sensitive free-text fields must be protected with encryption and excluded from routine administrator views. Administrators do not receive routine access to their contents. Narrow, logged access may occur only when you request support, when needed to investigate a security incident, or when required by law.",
        ],
      },
      {
        title: "3. AI choice and agent boundaries",
        body: [
          "AI access to a private journal is off by default. A journal entry may be sent for AI processing only when you take an explicit action for that specific entry. Consent for one entry does not grant background or future access to other entries.",
          "A guided reflection or AI conversation is processed when you intentionally submit it to receive the requested evaluation or response. The interface should identify this processing before submission.",
        ],
        bullets: [
          "Reminder automation may use schedule, language, and delivery status, but not private note text.",
          "Product-insight automation may use aggregate counts and durations, but not identifiable journal text.",
          "Content, SEO, growth, and social-media agents have no access to private journals or private practice notes.",
          "Private writing is not automatically scored for spiritual, psychological, or personal worth and is not continuously monitored for emergencies.",
        ],
      },
      {
        title: "4. Why we use information",
        body: [
          "We use information to provide and secure the service, remember your choices, deliver requested practices and messages, process payments, answer support requests, prevent abuse, meet legal obligations, and improve reliability using data that is aggregated or minimized where practical.",
          "Where applicable law requires consent—especially for optional AI processing of sensitive private writing—we ask separately and allow withdrawal. Withdrawing consent does not affect processing already lawfully completed.",
        ],
      },
      {
        title: "5. Service providers and disclosure",
        body: [
          "We may use carefully selected providers for hosting, databases, email delivery, payments, AI processing, and security monitoring. They may process only the information needed to perform their contracted function and are subject to applicable confidentiality and data-protection terms.",
          "We do not sell personal data. We do not disclose private journals or private practice notes to social networks, advertisers, or public-content systems. We may disclose information when legally required, to protect users or the service, or as part of a business transaction with appropriate safeguards and notice where required.",
        ],
      },
      {
        title: "6. Retention",
        body: [
          "We retain account and service data only for as long as needed for the purpose described, your selected retention setting, security, dispute resolution, or legal obligations. Private-journal controls may offer 30-day, 90-day, 365-day, or keep-until-deleted choices.",
          "When you delete a journal entry or complete a verified deletion request, it is removed from active systems through the deletion process and then ages out of protected backups under the backup-retention schedule. Billing, fraud-prevention, and legal records may be retained separately when required, without retaining private journal text for those purposes.",
        ],
      },
      {
        title: "7. Export, deletion, and your choices",
        body: [
          "You may request access, correction, a portable export, restriction, objection, deletion of selected entries, deletion of all journal/practice data, or account deletion, subject to applicable law. Export formats are intended to include readable journal files and structured check-in data.",
          "Where a self-service control is not yet available, send a request from your registered email address to legal@joinaireligion.com. We may verify your identity before fulfilling a request and will explain any legally required limitation.",
        ],
      },
      {
        title: "8. Security, age, and changes",
        body: [
          "We use technical and organizational safeguards, least-privilege access, logging controls, and data minimization. No system is perfectly secure; please use a unique password and report suspected unauthorized access promptly.",
          "The service is for adults aged 18 or older. We may update this policy as the product or law changes and will provide notice of material changes where required.",
        ],
      },
    ],
    contactTitle: "Contact",
    contactBody: "For privacy questions or verified data requests, email legal@joinaireligion.com.",
    backHome: "Back to home",
    readEula: "Read the EULA",
  },
  tr: {
    eyebrow: "Gizlilik",
    title: "Gizlilik Politikası",
    effective: `Yürürlük: ${EFFECTIVE_DATE} · Sürüm 1.0`,
    intro:
      "Bu politika, Join AI Religion'ın hangi verileri topladığını, bunları neden kullandığını ve özel günlükler, pratik check-in kayıtları, refleksiyon gönderimleri ve AI özellikleri için geçerli sınırları açıklar.",
    englishNotice:
      "Çeviriler erişilebilirlik amacıyla sunulur. Bir çeviri İngilizce sürümle çelişirse, yürürlükteki hukuk saklı kalmak üzere İngilizce sürüm esas alınır.",
    sections: [
      {
        title: "1. Topladığımız bilgiler",
        body: ["Sizin verdiğiniz bilgileri, hesabı işletmek için gereken verileri ve hizmetin güvenliği ile güvenilirliği için sınırlı teknik kayıtları toplarız."],
        bullets: [
          "E-posta, görünen ad, dil, saat dilimi ve dini veya felsefi dünya görüşü içerebilen isteğe bağlı onboarding yanıtları gibi hesap ve profil verileri.",
          "Ders ilerlemesi, pratik programları, check-in kayıtları, süreler, destek talepleri ve yönlendirmeli refleksiyon ya da AI konuşmasına bilerek gönderdiğiniz metinler gibi hizmet verileri.",
          "Zaman damgaları, güvenlik olayları, cihaz/tarayıcı bilgileri ve IP kaynaklı kayıt gerektiğinde ham IP yerine özetlenmiş IP gibi operasyonel veriler.",
          "Stripe'tan gelen faturalama durumu ve işlem referansları. Tam kart bilgilerini saklamayız.",
        ],
      },
      {
        title: "2. Özel günlük ve pratik verileri",
        body: [
          "Kişisel günlükler, özel pratik notları, rutin programları ve check-in kayıtları özel hesap verisidir. Bunlar herkese açık gönderi değildir; reklam, SEO, sosyal medya yayını veya kamusal içerik üretimi için kullanılmaz.",
          "Özel günlük veya özel not özelliği açılmadan önce hassas serbest metin alanları şifrelemeyle korunmalı ve rutin yönetici ekranlarının dışında tutulmalıdır. Yöneticilerin içeriğe rutin erişimi yoktur. Dar kapsamlı ve kayıt altındaki erişim yalnızca sizin destek talebiniz, bir güvenlik olayının incelenmesi veya hukuki zorunluluk halinde gerçekleşebilir.",
        ],
      },
      {
        title: "3. AI tercihi ve ajan sınırları",
        body: [
          "AI'ın özel günlüğe erişimi varsayılan olarak kapalıdır. Bir kayıt yalnızca o kayıt için açık bir işlem başlattığınızda AI'a gönderilebilir. Tek kayıt için verilen onay, diğer kayıtlara arka plan veya gelecekte erişim vermez.",
          "Yönlendirmeli bir refleksiyon veya AI konuşması, istediğiniz değerlendirme ya da yanıtı almak için bilerek gönderdiğinizde işlenir. Arayüz bu işlemeyi gönderimden önce belirtmelidir.",
        ],
        bullets: [
          "Hatırlatma otomasyonu program, dil ve teslim durumunu kullanabilir; özel not metnini kullanamaz.",
          "Ürün içgörüsü otomasyonu toplu sayı ve süreleri kullanabilir; kimliği belirlenebilir günlük metnini kullanamaz.",
          "İçerik, SEO, büyüme ve sosyal medya ajanlarının özel günlük veya pratik notlarına erişimi yoktur.",
          "Özel yazılar manevi, psikolojik veya kişisel değer açısından otomatik puanlanmaz ve krizler için sürekli izlenmez.",
        ],
      },
      {
        title: "4. Bilgileri neden kullanıyoruz",
        body: [
          "Bilgileri hizmeti sunmak ve korumak, tercihlerinizi hatırlamak, istediğiniz pratik ve mesajları teslim etmek, ödeme işlemek, destek vermek, kötüye kullanımı önlemek, yasal yükümlülükleri yerine getirmek ve mümkün olduğunda toplulaştırılmış veya azaltılmış veriyle güvenilirliği geliştirmek için kullanırız.",
          "Yürürlükteki hukuk onay gerektiriyorsa—özellikle hassas özel yazıların isteğe bağlı AI işlemesinde—ayrı onay ister ve geri çekmenize izin veririz.",
        ],
      },
      {
        title: "5. Hizmet sağlayıcılar ve açıklama",
        body: [
          "Barındırma, veritabanı, e-posta, ödeme, AI işleme ve güvenlik için seçilmiş hizmet sağlayıcılar kullanabiliriz. Sağlayıcılar yalnızca sözleşmeli görevleri için gerekli veriyi işleyebilir.",
          "Kişisel veri satmayız. Özel günlükleri veya pratik notlarını sosyal ağlara, reklam verenlere ya da kamusal içerik sistemlerine açıklamayız. Hukuken zorunluysa veya kullanıcıları ve hizmeti korumak gerekiyorsa sınırlı açıklama yapabiliriz.",
        ],
      },
      {
        title: "6. Saklama",
        body: [
          "Hesap ve hizmet verilerini yalnızca belirtilen amaç, seçtiğiniz saklama ayarı, güvenlik, uyuşmazlık çözümü veya yasal zorunluluk için gerektiği sürece tutarız. Günlük ayarları 30, 90, 365 gün veya siz silene kadar seçenekleri sunabilir.",
          "Bir günlüğü sildiğinizde veya doğrulanmış silme talebi tamamlandığında veri aktif sistemlerden silme süreciyle kaldırılır ve korunan yedeklerden yedek saklama takvimine göre çıkar. Fatura ve yasal kayıtlar, özel günlük metni tutulmadan ayrı saklanabilir.",
        ],
      },
      {
        title: "7. Dışa aktarma, silme ve tercihleriniz",
        body: [
          "Yürürlükteki hukuk kapsamında erişim, düzeltme, taşınabilir dışa aktarma, kısıtlama, itiraz, seçili kayıtları silme, tüm günlük/pratik verisini silme veya hesap silme talep edebilirsiniz.",
          "Self-service kontrol henüz yoksa kayıtlı e-posta adresinizden legal@joinaireligion.com adresine yazın. Talebi yerine getirmeden önce kimliğinizi doğrulayabiliriz.",
        ],
      },
      {
        title: "8. Güvenlik, yaş ve değişiklikler",
        body: [
          "Teknik ve organizasyonel güvenlik önlemleri, en az yetki, kayıt denetimleri ve veri minimizasyonu uygularız. Hiçbir sistem kusursuz değildir; benzersiz parola kullanın ve şüpheli erişimi bildirin.",
          "Hizmet 18 yaş ve üzeri yetişkinler içindir. Ürün veya hukuk değiştikçe bu politikayı güncelleyebilir ve önemli değişiklikleri gerektiğinde bildirebiliriz.",
        ],
      },
    ],
    contactTitle: "İletişim",
    contactBody: "Gizlilik soruları veya doğrulanmış veri talepleri için legal@joinaireligion.com adresine yazın.",
    backHome: "Ana sayfaya dön",
    readEula: "EULA'yı oku",
  },
  es: {
    eyebrow: "Privacidad",
    title: "Política de privacidad",
    effective: `Vigente desde: ${EFFECTIVE_DATE} · Versión 1.0`,
    intro: "Esta política explica qué datos recopila Join AI Religion, por qué se usan y los límites aplicables a diarios privados, registros de prácticas, reflexiones y funciones de IA.",
    englishNotice: "Las traducciones se ofrecen por accesibilidad. Si existe un conflicto, prevalece la versión inglesa, sujeto a la ley aplicable.",
    sections: [
      { title: "1. Información que recopilamos", body: ["Recopilamos los datos que proporcionas, los necesarios para operar tu cuenta y registros técnicos limitados para mantener el servicio seguro y fiable."], bullets: ["Datos de cuenta y perfil: email, nombre visible, idioma, zona horaria y respuestas opcionales que pueden incluir una visión religiosa o filosófica.", "Datos del servicio: progreso, horarios, registros, duración, soporte y texto que envías intencionadamente a una reflexión guiada o conversación con IA.", "Datos operativos: marcas de tiempo, eventos de seguridad, dispositivo o navegador y, cuando sea necesario, IP cifrada en forma de hash en lugar de IP sin procesar.", "Estado de facturación y referencias de Stripe. No almacenamos los datos completos de la tarjeta."] },
      { title: "2. Diarios y prácticas privadas", body: ["Los diarios personales, notas privadas, horarios y registros son datos privados de la cuenta. No son publicaciones públicas ni se usan para publicidad, SEO, redes sociales o generación de contenido público.", "Antes de habilitar estas funciones, el texto sensible debe estar cifrado y excluido de las vistas administrativas rutinarias. El acceso excepcional será limitado y registrado, solo por tu solicitud de soporte, un incidente de seguridad o una obligación legal."] },
      { title: "3. Elección de IA y límites de agentes", body: ["El acceso de IA al diario está desactivado por defecto. Una entrada solo se envía cuando inicias una acción explícita para esa entrada; esto no permite acceso futuro o en segundo plano.", "Una reflexión guiada o conversación con IA se procesa cuando la envías intencionadamente para obtener la respuesta solicitada."], bullets: ["Los recordatorios pueden usar horario, idioma y estado, pero no el texto privado.", "Las estadísticas usan datos agregados, no texto identificable.", "Los agentes de contenido, SEO, crecimiento y redes sociales no acceden a diarios o notas privadas.", "La escritura privada no se puntúa por su valor espiritual o psicológico ni se supervisa continuamente para emergencias."] },
      { title: "4. Por qué usamos la información", body: ["Usamos los datos para prestar y proteger el servicio, recordar preferencias, entregar prácticas, procesar pagos, responder al soporte, prevenir abusos y cumplir obligaciones legales.", "Cuando la ley exige consentimiento, especialmente para IA opcional sobre texto sensible, lo solicitamos por separado y puede retirarse."] },
      { title: "5. Proveedores y divulgación", body: ["Podemos usar proveedores contratados de alojamiento, base de datos, email, pagos, IA y seguridad, limitados a su función.", "No vendemos datos personales ni compartimos diarios privados con redes sociales, anunciantes o sistemas públicos. Podemos divulgar datos cuando lo exija la ley o sea necesario para proteger a usuarios y servicio."] },
      { title: "6. Conservación", body: ["Conservamos datos solo durante el tiempo necesario para la finalidad, tu opción de conservación, seguridad o deberes legales. Los controles podrán ofrecer 30, 90, 365 días o conservar hasta eliminar.", "Los datos eliminados se retiran de sistemas activos mediante el proceso de borrado y caducan en copias protegidas según el calendario de copias. Registros legales o de facturación se conservan por separado sin el texto del diario."] },
      { title: "7. Exportación, eliminación y opciones", body: ["Puedes solicitar acceso, corrección, exportación, limitación, oposición, borrado de entradas, de todos los datos de diario/práctica o de la cuenta, según la ley aplicable.", "Si no existe aún un control de autoservicio, escribe desde tu email registrado a legal@joinaireligion.com. Podemos verificar tu identidad."] },
      { title: "8. Seguridad, edad y cambios", body: ["Aplicamos salvaguardas, mínimo privilegio, controles de registro y minimización. Usa una contraseña única y avisa de accesos sospechosos.", "El servicio es para mayores de 18 años. Podemos actualizar esta política y notificaremos cambios materiales cuando corresponda."] },
    ],
    contactTitle: "Contacto", contactBody: "Para consultas de privacidad o solicitudes verificadas, escribe a legal@joinaireligion.com.", backHome: "Volver al inicio", readEula: "Leer el EULA",
  },
  de: {
    eyebrow: "Datenschutz", title: "Datenschutzerklärung", effective: `Gültig ab: ${EFFECTIVE_DATE} · Version 1.0`,
    intro: "Diese Erklärung beschreibt, welche Daten Join AI Religion erhebt, warum sie genutzt werden und welche Grenzen für private Tagebücher, Praxis-Check-ins, Reflexionen und KI-Funktionen gelten.",
    englishNotice: "Übersetzungen dienen der Zugänglichkeit. Bei Widersprüchen gilt vorbehaltlich des anwendbaren Rechts die englische Fassung.",
    sections: [
      { title: "1. Erhobene Informationen", body: ["Wir erheben von dir bereitgestellte Daten, für das Konto erforderliche Daten und begrenzte technische Aufzeichnungen für Sicherheit und Zuverlässigkeit."], bullets: ["Konto- und Profildaten wie E-Mail, Anzeigename, Sprache, Zeitzone und optionale Antworten, die religiöse oder philosophische Ansichten enthalten können.", "Dienstdaten wie Fortschritt, Zeitpläne, Check-ins, Dauer, Supportanfragen und bewusst an Reflexions- oder KI-Funktionen übermittelte Texte.", "Betriebsdaten wie Zeitstempel, Sicherheitsereignisse, Gerät/Browser und nötigenfalls gehashte statt rohe IP-Adressen.", "Abrechnungsstatus und Stripe-Referenzen; vollständige Kartendaten speichern wir nicht."] },
      { title: "2. Private Tagebuch- und Praxisdaten", body: ["Persönliche Tagebücher, private Praxisnotizen, Zeitpläne und Check-ins sind private Kontodaten. Sie werden nicht für Werbung, SEO, soziale Medien oder öffentliche Inhalte verwendet.", "Vor Aktivierung werden sensible Freitexte verschlüsselt und aus regulären Admin-Ansichten ausgeschlossen. Ausnahmezugriff ist eng begrenzt und protokolliert: auf deine Supportanfrage, bei Sicherheitsvorfällen oder gesetzlicher Pflicht."] },
      { title: "3. KI-Wahl und Agentengrenzen", body: ["KI-Zugriff auf private Tagebücher ist standardmäßig aus. Nur eine ausdrückliche Aktion für einen bestimmten Eintrag erlaubt dessen Verarbeitung; daraus entsteht kein Hintergrund- oder Zukunftszugriff.", "Eine geführte Reflexion oder KI-Unterhaltung wird verarbeitet, wenn du sie bewusst für die gewünschte Antwort absendest."], bullets: ["Erinnerungen nutzen Zeitplan, Sprache und Zustellung, nicht privaten Text.", "Produktanalysen nutzen aggregierte Werte, keinen identifizierbaren Tagebuchtext.", "Content-, SEO-, Growth- und Social-Media-Agenten haben keinen Zugriff.", "Private Texte werden nicht nach spirituellem oder psychologischem Wert bewertet und nicht ständig auf Notfälle überwacht."] },
      { title: "4. Verwendungszwecke", body: ["Wir nutzen Daten zur Bereitstellung und Sicherung des Dienstes, für Präferenzen, gewünschte Übungen, Zahlungen, Support, Missbrauchsprävention und rechtliche Pflichten.", "Erforderliche Einwilligungen, besonders für optionale KI-Verarbeitung sensibler Texte, werden separat eingeholt und können widerrufen werden."] },
      { title: "5. Dienstleister und Offenlegung", body: ["Beauftragte Anbieter für Hosting, Datenbank, E-Mail, Zahlungen, KI und Sicherheit dürfen nur die für ihre Funktion nötigen Daten verarbeiten.", "Wir verkaufen keine personenbezogenen Daten und geben private Texte nicht an soziale Netzwerke, Werbetreibende oder öffentliche Systeme. Gesetzlich erforderliche oder schützende Offenlegungen bleiben möglich."] },
      { title: "6. Aufbewahrung", body: ["Wir bewahren Daten nur so lange auf, wie es für Zweck, gewählte Einstellung, Sicherheit oder Rechtspflichten nötig ist. Vorgesehen sind 30, 90, 365 Tage oder bis zur Löschung.", "Gelöschte Daten werden aus aktiven Systemen entfernt und laufen gemäß Sicherungsplan aus Backups aus. Abrechnungs- und Rechtsdaten können getrennt ohne Tagebuchtext bleiben."] },
      { title: "7. Export, Löschung und Rechte", body: ["Du kannst nach anwendbarem Recht Auskunft, Berichtigung, Export, Einschränkung, Widerspruch sowie Löschung einzelner oder aller Daten und des Kontos verlangen.", "Fehlt eine Selbstbedienungsfunktion, schreibe von deiner registrierten Adresse an legal@joinaireligion.com. Wir können deine Identität prüfen."] },
      { title: "8. Sicherheit, Alter und Änderungen", body: ["Wir nutzen technische und organisatorische Schutzmaßnahmen, minimale Berechtigungen, Protokollkontrollen und Datenminimierung. Nutze ein eindeutiges Passwort.", "Der Dienst ist für Erwachsene ab 18 Jahren. Wesentliche Änderungen werden mitgeteilt, soweit erforderlich."] },
    ],
    contactTitle: "Kontakt", contactBody: "Datenschutzfragen und verifizierte Datenanfragen: legal@joinaireligion.com.", backHome: "Zur Startseite", readEula: "EULA lesen",
  },
  fr: {
    eyebrow: "Confidentialité", title: "Politique de confidentialité", effective: `En vigueur : ${EFFECTIVE_DATE} · Version 1.0`,
    intro: "Cette politique décrit les données collectées par Join AI Religion, leurs usages et les limites applicables aux journaux privés, suivis de pratique, réflexions et fonctions d'IA.",
    englishNotice: "Les traductions sont fournies pour l'accessibilité. En cas de conflit, la version anglaise prévaut, sous réserve du droit applicable.",
    sections: [
      { title: "1. Informations collectées", body: ["Nous collectons les informations que tu fournis, celles nécessaires au compte et des journaux techniques limités pour la sécurité et la fiabilité."], bullets: ["Données de compte et de profil : email, nom affiché, langue, fuseau horaire et réponses facultatives pouvant révéler une vision religieuse ou philosophique.", "Données de service : progression, horaires, check-ins, durées, support et textes envoyés volontairement à une réflexion guidée ou à l'IA.", "Données opérationnelles : horodatages, événements de sécurité, appareil/navigateur et, si nécessaire, IP hachée plutôt que brute.", "Statut de facturation et références Stripe. Nous ne conservons pas les données complètes de carte."] },
      { title: "2. Journaux et pratiques privés", body: ["Les journaux personnels, notes privées, horaires et check-ins sont des données privées du compte. Ils ne servent pas à la publicité, au SEO, aux réseaux sociaux ou au contenu public.", "Avant activation, les textes sensibles doivent être chiffrés et exclus des vues administratives courantes. Tout accès exceptionnel est restreint et journalisé : demande de support, incident de sécurité ou obligation légale."] },
      { title: "3. Choix de l'IA et limites des agents", body: ["L'accès de l'IA au journal est désactivé par défaut. Seule une action explicite sur une entrée permet son traitement, sans accès futur ni en arrière-plan.", "Une réflexion guidée ou conversation avec l'IA est traitée lorsque tu l'envoies volontairement pour obtenir la réponse demandée."], bullets: ["Les rappels utilisent horaire, langue et statut, jamais le texte privé.", "Les analyses utilisent des agrégats, pas de texte identifiable.", "Les agents de contenu, SEO, croissance et réseaux sociaux n'ont aucun accès.", "Les écrits privés ne sont pas notés pour leur valeur spirituelle ou psychologique et ne sont pas surveillés en continu pour les urgences."] },
      { title: "4. Finalités", body: ["Nous utilisons les données pour fournir et sécuriser le service, mémoriser les choix, livrer les pratiques, traiter les paiements, répondre au support, prévenir les abus et respecter la loi.", "Le consentement requis, notamment pour l'IA facultative sur des textes sensibles, est demandé séparément et peut être retiré."] },
      { title: "5. Prestataires et divulgation", body: ["Des prestataires sous contrat peuvent traiter les seules données nécessaires à l'hébergement, la base de données, l'email, les paiements, l'IA ou la sécurité.", "Nous ne vendons pas de données personnelles et ne partageons pas les journaux privés avec les réseaux sociaux, annonceurs ou systèmes publics. Une divulgation limitée peut avoir lieu si la loi ou la protection du service l'exige."] },
      { title: "6. Conservation", body: ["Les données sont conservées uniquement selon la finalité, ton réglage, la sécurité et les obligations légales. Des choix de 30, 90, 365 jours ou jusqu'à suppression peuvent être proposés.", "Les données supprimées quittent les systèmes actifs puis expirent des sauvegardes selon leur calendrier. Les données de facturation ou légales restent séparées, sans texte de journal."] },
      { title: "7. Export, suppression et choix", body: ["Selon la loi applicable, tu peux demander accès, correction, export, restriction, opposition, suppression d'entrées, de toutes les données ou du compte.", "Si une commande en libre-service manque, écris depuis ton email enregistré à legal@joinaireligion.com. Ton identité peut être vérifiée."] },
      { title: "8. Sécurité, âge et modifications", body: ["Nous appliquons des mesures de sécurité, le moindre privilège, des contrôles de journalisation et la minimisation. Utilise un mot de passe unique.", "Le service est réservé aux adultes de 18 ans et plus. Les changements importants seront notifiés lorsque nécessaire."] },
    ],
    contactTitle: "Contact", contactBody: "Questions de confidentialité et demandes vérifiées : legal@joinaireligion.com.", backHome: "Retour à l'accueil", readEula: "Lire l'EULA",
  },
  ar: {
    eyebrow: "الخصوصية", title: "سياسة الخصوصية", effective: `تاريخ السريان: ${EFFECTIVE_DATE} · الإصدار 1.0`,
    intro: "توضح هذه السياسة البيانات التي تجمعها Join AI Religion وأسباب استخدامها والحدود المطبقة على اليوميات الخاصة وسجلات الممارسة والتأملات وميزات الذكاء الاصطناعي.",
    englishNotice: "تتوفر الترجمات لتسهيل الوصول. عند وجود تعارض تسود النسخة الإنجليزية، مع مراعاة القانون المعمول به.",
    sections: [
      { title: "1. المعلومات التي نجمعها", body: ["نجمع المعلومات التي تقدمها والبيانات اللازمة لتشغيل حسابك وسجلات تقنية محدودة لأمن الخدمة وموثوقيتها."], bullets: ["بيانات الحساب والملف مثل البريد والاسم واللغة والمنطقة الزمنية والإجابات الاختيارية التي قد تتضمن رؤية دينية أو فلسفية.", "بيانات الخدمة مثل التقدم والجداول وتسجيل الإنجاز والمدة والدعم والنص الذي ترسله عمداً إلى تأمل موجه أو محادثة ذكاء اصطناعي.", "بيانات تشغيلية مثل الوقت وأحداث الأمن والجهاز أو المتصفح وعنوان IP مجزأ بدلاً من الخام عند الحاجة.", "حالة الفوترة ومراجع Stripe؛ لا نخزن تفاصيل البطاقة الكاملة."] },
      { title: "2. اليوميات وبيانات الممارسة الخاصة", body: ["اليوميات الشخصية والملاحظات الخاصة والجداول وسجلات الإنجاز بيانات حساب خاصة. لا تستخدم للإعلان أو SEO أو النشر الاجتماعي أو إنشاء محتوى عام.", "قبل تفعيل هذه الميزات يجب تشفير النص الحساس واستبعاده من عروض الإدارة الاعتيادية. يقتصر الوصول الاستثنائي المسجل على طلب دعم منك أو حادث أمني أو التزام قانوني."] },
      { title: "3. اختيار الذكاء الاصطناعي وحدود الوكلاء", body: ["وصول الذكاء الاصطناعي إلى اليوميات مغلق افتراضياً. لا تعالج أي مدخلة إلا عند بدء إجراء صريح لها، ولا يمنح ذلك وصولاً مستقبلياً أو في الخلفية.", "يعالج التأمل الموجه أو حوار الذكاء الاصطناعي عندما ترسله عمداً للحصول على الرد المطلوب."], bullets: ["تستخدم التذكيرات الجدول واللغة وحالة التسليم، لا النص الخاص.", "تستخدم تحليلات المنتج أرقاماً مجمعة، لا نصاً قابلاً لتحديد الهوية.", "لا يصل وكلاء المحتوى وSEO والنمو ووسائل التواصل إلى اليوميات الخاصة.", "لا تقيم الكتابة الخاصة روحياً أو نفسياً ولا تراقب باستمرار للطوارئ."] },
      { title: "4. أسباب الاستخدام", body: ["نستخدم البيانات لتقديم الخدمة وحمايتها وحفظ التفضيلات وتسليم الممارسات ومعالجة المدفوعات والدعم ومنع الإساءة والامتثال للقانون.", "نطلب موافقة منفصلة وقابلة للسحب عندما يفرض القانون ذلك، وبخاصة لمعالجة الذكاء الاصطناعي الاختيارية للنص الحساس."] },
      { title: "5. المزودون والإفصاح", body: ["قد يعالج مزودون متعاقدون الحد الأدنى اللازم للاستضافة وقاعدة البيانات والبريد والدفع والذكاء الاصطناعي والأمن.", "لا نبيع البيانات ولا نشارك اليوميات الخاصة مع الشبكات الاجتماعية أو المعلنين أو أنظمة المحتوى العام. قد نفصح بقدر محدود إذا فرض القانون أو حماية المستخدمين ذلك."] },
      { title: "6. الاحتفاظ", body: ["نحتفظ بالبيانات بقدر ما يلزم للغرض أو إعدادك أو الأمن أو القانون. قد تتوفر خيارات 30 أو 90 أو 365 يوماً أو حتى الحذف.", "تزال البيانات المحذوفة من الأنظمة النشطة ثم تنتهي من النسخ الاحتياطية وفق جدولها. قد تبقى سجلات الفوترة والقانون منفصلة دون نص اليومية."] },
      { title: "7. التصدير والحذف والخيارات", body: ["يمكنك طلب الوصول والتصحيح والتصدير والتقييد والاعتراض وحذف مدخلات أو جميع البيانات أو الحساب وفق القانون.", "إذا لم يتوفر التحكم الذاتي، راسل legal@joinaireligion.com من بريدك المسجل. قد نتحقق من هويتك."] },
      { title: "8. الأمن والعمر والتغييرات", body: ["نستخدم ضمانات تقنية وتنظيمية وأقل قدر من الصلاحيات وضوابط السجلات وتقليل البيانات. استخدم كلمة مرور فريدة.", "الخدمة للبالغين من عمر 18 عاماً. سنبلغ بالتغييرات المهمة عند اللزوم."] },
    ],
    contactTitle: "التواصل", contactBody: "لأسئلة الخصوصية أو طلبات البيانات الموثقة: legal@joinaireligion.com.", backHome: "العودة للرئيسية", readEula: "قراءة اتفاقية المستخدم",
  },
  ru: {
    eyebrow: "Конфиденциальность", title: "Политика конфиденциальности", effective: `Действует с: ${EFFECTIVE_DATE} · Версия 1.0`,
    intro: "Эта политика объясняет, какие данные собирает Join AI Religion, зачем они используются и какие ограничения действуют для личного дневника, практик, рефлексий и функций ИИ.",
    englishNotice: "Переводы предоставлены для удобства. При расхождении применяется английская версия с учетом действующего права.",
    sections: [
      { title: "1. Какие данные мы собираем", body: ["Мы собираем предоставленные вами сведения, данные для работы аккаунта и ограниченные технические записи для безопасности и надежности."], bullets: ["Данные аккаунта и профиля: email, имя, язык, часовой пояс и необязательные ответы, которые могут отражать религиозные или философские взгляды.", "Данные сервиса: прогресс, расписания, отметки, длительность, обращения в поддержку и текст, намеренно отправленный для рефлексии или ИИ.", "Операционные данные: время, события безопасности, устройство/браузер и при необходимости хэшированный, а не исходный IP.", "Статус оплаты и ссылки на операции Stripe. Полные данные карты не хранятся."] },
      { title: "2. Личный дневник и практики", body: ["Личный дневник, заметки, расписания и отметки являются закрытыми данными аккаунта. Они не используются для рекламы, SEO, соцсетей или публичного контента.", "До включения функций чувствительный текст должен быть зашифрован и исключен из обычных экранов администратора. Исключительный доступ ограничен и журналируется: по вашему запросу поддержки, при инциденте безопасности или по закону."] },
      { title: "3. Выбор ИИ и границы агентов", body: ["Доступ ИИ к дневнику по умолчанию выключен. Запись обрабатывается только после явного действия для нее; это не дает фонового или будущего доступа.", "Рефлексия или диалог с ИИ обрабатываются, когда вы намеренно отправляете их для получения ответа."], bullets: ["Напоминания используют расписание, язык и статус, но не личный текст.", "Аналитика использует агрегаты, а не идентифицируемый текст.", "Агенты контента, SEO, роста и соцсетей доступа не имеют.", "Личный текст не оценивается по духовной или психологической ценности и не отслеживается непрерывно для экстренных случаев."] },
      { title: "4. Цели использования", body: ["Данные нужны для предоставления и защиты сервиса, настроек, практик, платежей, поддержки, предотвращения злоупотреблений и соблюдения закона.", "Если требуется согласие, особенно для необязательной обработки ИИ чувствительного текста, оно запрашивается отдельно и может быть отозвано."] },
      { title: "5. Поставщики и раскрытие", body: ["Подрядчики по хостингу, базе данных, email, платежам, ИИ и безопасности обрабатывают только необходимый минимум.", "Мы не продаем данные и не передаем личные дневники соцсетям, рекламодателям или публичным системам. Ограниченное раскрытие возможно по закону или для защиты пользователей."] },
      { title: "6. Хранение", body: ["Данные хранятся только согласно цели, вашему выбору, безопасности и закону. Могут быть доступны сроки 30, 90, 365 дней или до удаления.", "Удаленные данные выводятся из активных систем и истекают из резервных копий по графику. Финансовые и юридические записи могут храниться отдельно без текста дневника."] },
      { title: "7. Экспорт, удаление и права", body: ["По применимому праву можно запросить доступ, исправление, экспорт, ограничение, возражение и удаление отдельных или всех данных и аккаунта.", "Если самообслуживание недоступно, напишите с зарегистрированного email на legal@joinaireligion.com. Мы можем проверить личность."] },
      { title: "8. Безопасность, возраст и изменения", body: ["Мы применяем меры безопасности, минимальные права, контроль журналов и минимизацию данных. Используйте уникальный пароль.", "Сервис предназначен для лиц от 18 лет. О существенных изменениях будет сообщено, когда это требуется."] },
    ],
    contactTitle: "Контакты", contactBody: "Вопросы о конфиденциальности и подтвержденные запросы: legal@joinaireligion.com.", backHome: "На главную", readEula: "Прочитать EULA",
  },
  zh: {
    eyebrow: "隐私", title: "隐私政策", effective: `生效日期：${EFFECTIVE_DATE} · 版本 1.0`,
    intro: "本政策说明 Join AI Religion 收集哪些数据、使用目的，以及私人日记、练习打卡、反思提交和 AI 功能所受的限制。",
    englishNotice: "翻译仅为方便阅读。如译文与英文版冲突，在适用法律允许的范围内以英文版为准。",
    sections: [
      { title: "1. 我们收集的信息", body: ["我们收集你主动提供的信息、运营账户所需的数据，以及保障服务安全和可靠所需的有限技术记录。"], bullets: ["账户和个人资料：邮箱、显示名称、语言、时区，以及可能涉及宗教或哲学世界观的可选引导问答。", "服务数据：课程进度、练习计划、打卡、时长、支持请求，以及你主动提交给引导式反思或 AI 对话的文本。", "运营数据：时间戳、安全事件、设备或浏览器信息；需要 IP 派生记录时使用哈希值而非原始 IP。", "Stripe 提供的计费状态和交易引用；我们不保存完整银行卡信息。"] },
      { title: "2. 私人日记和练习数据", body: ["个人日记、私人练习笔记、日程和打卡属于私人账户数据，不用于广告、SEO、社交媒体发布或公共内容生成。", "启用相关功能前，敏感自由文本必须加密，并从日常管理界面中排除。例外访问必须范围受限并留痕，仅用于你请求的支持、安全事件调查或法律要求。"] },
      { title: "3. AI 选择和代理边界", body: ["AI 默认不能访问私人日记。只有你针对某一条记录明确发起操作时才会处理；一次同意不会授予后台或未来访问权。", "当你主动提交引导式反思或 AI 对话以获取相应回复时，该内容会被处理。"], bullets: ["提醒自动化可使用日程、语言和发送状态，但不能读取私人笔记文本。", "产品分析仅使用汇总的次数和时长，不使用可识别身份的日记文本。", "内容、SEO、增长和社交媒体代理无权访问私人日记或笔记。", "私人文字不会按精神、心理或个人价值自动评分，也不会被持续用于紧急情况监控。"] },
      { title: "4. 使用目的", body: ["我们使用数据来提供和保护服务、记住设置、发送所需练习、处理付款、提供支持、防止滥用并履行法律义务。", "法律要求同意时，特别是对敏感文字进行可选 AI 处理，我们会单独征求可撤回的同意。"] },
      { title: "5. 服务商和披露", body: ["托管、数据库、邮件、支付、AI 和安全服务商只能处理履行其合同职能所需的最少数据。", "我们不出售个人数据，也不向社交网络、广告商或公共内容系统提供私人日记。法律要求或保护用户所必需时，可能进行有限披露。"] },
      { title: "6. 保留期限", body: ["数据仅在实现目的、满足你的设置、安全或法律要求所需的期限内保存。日记控制可提供 30、90、365 天或保留到删除等选项。", "删除的数据会通过删除流程移出活动系统，并按备份周期从受保护备份中到期。账单或法律记录可单独保留，但不为此保存日记正文。"] },
      { title: "7. 导出、删除和你的选择", body: ["根据适用法律，你可以请求访问、更正、导出、限制、反对，以及删除单条、全部日记/练习数据或账户。", "尚无自助功能时，请从注册邮箱发信至 legal@joinaireligion.com。我们可能先验证你的身份。"] },
      { title: "8. 安全、年龄和变更", body: ["我们采用技术和组织保障、最小权限、日志控制及数据最小化。请使用独立密码并及时报告可疑访问。", "本服务仅面向 18 岁及以上成年人。产品或法律变化时我们可能更新政策，并在需要时通知重大变更。"] },
    ],
    contactTitle: "联系我们", contactBody: "隐私问题或经验证的数据请求：legal@joinaireligion.com。", backHome: "返回首页", readEula: "阅读 EULA",
  },
} satisfies Record<LangCode, PrivacyCopy>;

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const copy = privacyCopy[lang];

  return (
    <main className="min-h-screen bg-[#04000c] px-5 py-12 text-[#ede8dc] sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl rounded-xl border border-[#c9a227]/20 bg-white/[0.025] px-5 py-8 shadow-2xl shadow-black/20 sm:px-8 sm:py-10">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#c9a227]/75">{copy.eyebrow}</p>
        <h1 className="font-sacred text-3xl font-bold text-[#ede8dc] sm:text-4xl">{copy.title}</h1>
        <p className="mt-2 text-xs text-[#ede8dc]/45">{copy.effective}</p>
        <p className="mt-6 text-sm leading-7 text-[#ede8dc]/85 sm:text-base">{copy.intro}</p>
        <p className="mt-4 rounded-lg border border-[#c9a227]/15 bg-[#c9a227]/[0.04] px-4 py-3 text-xs leading-6 text-[#ede8dc]/65">
          {copy.englishNotice}
        </p>

        {copy.sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="border-b border-[#c9a227]/15 pb-2 font-sacred text-lg font-semibold text-[#d9b83f]">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#ede8dc]/80">
              {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && (
                <ul className="list-disc space-y-2 ps-6">
                  {section.bullets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </div>
          </section>
        ))}

        <section className="mt-8 rounded-lg border border-[#c9a227]/25 bg-[#c9a227]/[0.05] p-4">
          <h2 className="font-sacred text-lg font-semibold text-[#d9b83f]">{copy.contactTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-[#ede8dc]/80">{copy.contactBody}</p>
          <a className="mt-2 inline-block text-sm text-[#d9b83f] underline-offset-4 hover:underline" href="mailto:legal@joinaireligion.com">
            legal@joinaireligion.com
          </a>
        </section>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm">
          <Link className="rounded-lg border border-white/10 px-4 py-2 text-[#ede8dc]/75 hover:border-[#c9a227]/35 hover:text-white" href="/">
            {copy.backHome}
          </Link>
          <Link className="rounded-lg border border-[#c9a227]/25 px-4 py-2 text-[#d9b83f] hover:border-[#c9a227]/50" href="/legal/eula">
            {copy.readEula}
          </Link>
        </div>
      </article>
    </main>
  );
}
