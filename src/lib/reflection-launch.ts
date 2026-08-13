import {
  AgentArtifactStatus,
  AgentRunStatus,
  ContentModerationOutcome,
  ContentWorkflowStatus,
  type Prisma,
} from "@prisma/client";

import { buildAgentDecisionLog } from "@/lib/agent-decision-log";
import { db } from "@/lib/db";
import {
  SUPPORTED_CONTENT_LOCALES,
  assessContentVariants,
  buildFallbackVariant,
  sha256Fingerprint,
  type LocalizedContentVariant,
  type SupportedContentLocale,
} from "@/lib/growth-agents/content";

const LAUNCH_VERSION = "reflection-companion-launch-v1";
const CAMPAIGN_URL = "https://joinaireligion.com/companion?utm_source=insights&utm_medium=content&utm_campaign=reflection_companion_launch";

type CampaignCopy = {
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  heading: string;
  intro: string;
  limits: string;
  safety: string;
  cta: string;
  faqQuestion: string;
  faqAnswer: string;
};

const COPY: Record<SupportedContentLocale, CampaignCopy> = {
  en: {
    title: "Meet Reflection Companion: Ask What the Lesson Left Open",
    summary: "A private-by-design, member-only space for lesson-grounded questions and careful everyday reflection, with clear limits and no claim of authority.",
    seoTitle: "Reflection Companion for Thoughtful Member Questions",
    seoDescription: "Ask lesson-based questions in a bounded, private-by-design AI reflection space for Join AI Religion members.",
    heading: "A question can be the beginning of practice",
    intro: "A lesson can stay with you because it opened a question rather than closing one. Reflection Companion gives verified members a calm place to ask that next question. It responds with a concise perspective, a question to consider, and one small next step. It does not declare spiritual truth, rank beliefs, or replace human relationships and professional care.",
    limits: "Free and Seeker members can open one lesson-based session and use up to three turns each UTC day. Initiate members can open three sessions and use up to twenty-four turns, including an optional everyday-life reflection mode. These limits protect reliability and shared service capacity; the safety and care standard is the same for every member.",
    safety: "Questions and answers stay in the active browser conversation and are not saved to the application database. The provider is called without tools or stored provider state. Input and output pass automated safety checks, while account, network, session, and global budgets limit bots, account farms, and runaway cost. Only text-free operational counters are retained for abuse prevention and aggregate improvement.",
    cta: "Open Reflection Companion",
    faqQuestion: "Can Reflection Companion tell me what to believe?",
    faqAnswer: "No. It supports reflection and lesson comprehension, but it is not a religious authority and does not make decisions for the member.",
  },
  tr: {
    title: "Reflection Companion ile Tanışın: Dersin Açık Bıraktığını Sorun",
    summary: "Ders temelli sorular ve gündelik düşünme için; sınırları açık, otorite iddiası taşımayan, yalnızca üyelere açık ve mahremiyet odaklı bir alan.",
    seoTitle: "Üyeler İçin Güvenli Reflection Companion",
    seoDescription: "Join AI Religion üyeleri için sınırlandırılmış ve mahremiyet odaklı yapay zekâ düşünme alanında ders temelli sorular sorun.",
    heading: "Bir soru, pratiğin başlangıcı olabilir",
    intro: "Bir ders bazen cevap verdiği için değil, yeni bir soru açtığı için sizinle kalır. Reflection Companion, doğrulanmış üyelere bu sonraki soruyu sakince sorabilecekleri bir alan sunar. Kısa bir bakış açısı, üzerinde düşünülecek bir soru ve uygulanabilir küçük bir adımla yanıt verir. Manevi hakikat ilan etmez, inançları sıralamaz; insan ilişkilerinin veya profesyonel desteğin yerini tutmaz.",
    limits: "Free ve Seeker üyeler her UTC gününde bir ders temelli oturum ve en fazla üç mesaj kullanabilir. Initiate üyeler üç oturum ve yirmi dört mesaja ek olarak isteğe bağlı gündelik hayat düşünme moduna erişir. Bu sınırlar hizmet güvenilirliğini ve ortak kapasiteyi korur; güvenlik ve özen standardı bütün üyeler için aynıdır.",
    safety: "Sorular ve cevaplar etkin tarayıcı konuşmasında kalır; uygulama veritabanına kaydedilmez. Sağlayıcı araçsız ve saklanan sağlayıcı durumu olmadan çağrılır. Girdi ve çıktı otomatik güvenlik denetimlerinden geçer; hesap, ağ, oturum ve küresel bütçeler botları, sahte hesap kümelerini ve kontrolsüz maliyeti sınırlar. Kötüye kullanımı önlemek ve toplu iyileştirme için yalnızca metin içermeyen işletim sayaçları tutulur.",
    cta: "Reflection Companion'ı açın",
    faqQuestion: "Reflection Companion neye inanmam gerektiğini söyler mi?",
    faqAnswer: "Hayır. Düşünmeyi ve dersi anlamayı destekler; dini otorite değildir ve üye adına karar vermez.",
  },
  es: {
    title: "Conoce Reflection Companion: pregunta lo que la lección dejó abierto",
    summary: "Un espacio solo para miembros, privado por diseño y con límites claros, para preguntas sobre lecciones y reflexión cotidiana sin pretensión de autoridad.",
    seoTitle: "Reflection Companion para preguntas reflexivas",
    seoDescription: "Haz preguntas sobre las lecciones en un espacio de reflexión con IA limitado y privado por diseño para miembros.",
    heading: "Una pregunta puede iniciar la práctica",
    intro: "Una lección puede acompañarte porque abrió una pregunta en vez de cerrarla. Reflection Companion ofrece a los miembros verificados un lugar sereno para formular esa siguiente pregunta. Responde con una perspectiva breve, una pregunta para considerar y un pequeño paso posible. No declara verdades espirituales, no clasifica creencias y no sustituye las relaciones humanas ni la atención profesional.",
    limits: "Los miembros Free y Seeker disponen cada día UTC de una sesión basada en lecciones y tres turnos. Initiate dispone de tres sesiones y veinticuatro turnos, además de un modo opcional de reflexión sobre la vida cotidiana. Los límites protegen la fiabilidad y la capacidad compartida; el estándar de seguridad es igual para todos.",
    safety: "Las preguntas y respuestas permanecen en la conversación activa del navegador y no se guardan en la base de datos. El proveedor funciona sin herramientas ni estado almacenado. Controles de entrada y salida y presupuestos por cuenta, red, sesión y servicio reducen inyecciones, robots, granjas de cuentas y costes descontrolados. Solo se conservan contadores operativos sin texto.",
    cta: "Abrir Reflection Companion",
    faqQuestion: "¿Puede decirme Reflection Companion qué debo creer?",
    faqAnswer: "No. Apoya la reflexión y la comprensión, pero no es una autoridad religiosa ni decide por la persona.",
  },
  de: {
    title: "Reflection Companion: Fragen, was die Lektion offenließ",
    summary: "Ein nur für Mitglieder zugänglicher, datensparsamer Raum für Fragen zu Lektionen und vorsichtige Alltagsreflexion ohne Autoritätsanspruch.",
    seoTitle: "Reflection Companion für durchdachte Fragen",
    seoDescription: "Stelle Fragen zu Lektionen in einem begrenzten, datensparsamen KI-Reflexionsraum für Mitglieder.",
    heading: "Eine Frage kann der Anfang einer Praxis sein",
    intro: "Eine Lektion kann nachwirken, weil sie eine Frage öffnet, statt sie zu schließen. Reflection Companion gibt verifizierten Mitgliedern einen ruhigen Ort für diese nächste Frage. Die Antwort bietet eine knappe Perspektive, eine weiterführende Frage und einen kleinen umsetzbaren Schritt. Das System verkündet keine spirituelle Wahrheit, bewertet keine Überzeugungen und ersetzt weder menschliche Beziehungen noch professionelle Hilfe.",
    limits: "Free- und Seeker-Mitglieder erhalten pro UTC-Tag eine lektionenbezogene Sitzung mit drei Beiträgen. Initiate erhält drei Sitzungen und vierundzwanzig Beiträge sowie einen optionalen Modus für Alltagsreflexion. Die Grenzen schützen Zuverlässigkeit und gemeinsame Kapazität; der Sicherheitsstandard ist für alle gleich.",
    safety: "Fragen und Antworten bleiben im aktiven Browsergespräch und werden nicht in der Anwendungsdatenbank gespeichert. Der Anbieter wird ohne Werkzeuge und ohne gespeicherten Zustand aufgerufen. Ein- und Ausgabekontrollen sowie Budgets für Konto, Netzwerk, Sitzung und Gesamtdienst begrenzen Manipulation, Bots, Kontofarmen und unkontrollierte Kosten. Gespeichert werden nur textfreie Betriebszähler.",
    cta: "Reflection Companion öffnen",
    faqQuestion: "Sagt mir Reflection Companion, was ich glauben soll?",
    faqAnswer: "Nein. Es unterstützt Reflexion und Verständnis, ist aber keine religiöse Autorität und entscheidet nicht für Mitglieder.",
  },
  fr: {
    title: "Découvrez Reflection Companion : questionnez ce que la leçon a laissé ouvert",
    summary: "Un espace réservé aux membres, sobre en données et clairement limité, pour les questions de cours et la réflexion quotidienne sans prétention d'autorité.",
    seoTitle: "Reflection Companion pour des questions réfléchies",
    seoDescription: "Posez des questions sur les leçons dans un espace de réflexion IA limité et sobre en données pour les membres.",
    heading: "Une question peut ouvrir la pratique",
    intro: "Une leçon peut rester présente parce qu'elle a ouvert une question plutôt que de la fermer. Reflection Companion offre aux membres vérifiés un lieu calme pour poser cette question suivante. Il propose un point de vue concis, une question à explorer et une petite étape réalisable. Il ne proclame aucune vérité spirituelle, ne classe pas les croyances et ne remplace ni les relations humaines ni les soins professionnels.",
    limits: "Les membres Free et Seeker disposent chaque jour UTC d'une session liée aux leçons et de trois tours. Initiate dispose de trois sessions et vingt-quatre tours, ainsi que d'un mode facultatif de réflexion sur la vie quotidienne. Ces limites protègent la fiabilité et la capacité partagée ; le niveau de sécurité est identique pour tous.",
    safety: "Les questions et réponses restent dans la conversation active du navigateur et ne sont pas enregistrées dans la base de données. Le fournisseur est appelé sans outil ni état conservé. Les contrôles d'entrée et de sortie, ainsi que les budgets par compte, réseau, session et service, limitent injections, robots, fermes de comptes et coûts incontrôlés. Seuls des compteurs opérationnels sans texte sont conservés.",
    cta: "Ouvrir Reflection Companion",
    faqQuestion: "Reflection Companion peut-il me dire quoi croire ?",
    faqAnswer: "Non. Il soutient la réflexion et la compréhension, mais n'est pas une autorité religieuse et ne décide pas pour le membre.",
  },
  ar: {
    title: "تعرّف إلى Reflection Companion: اسأل عمّا تركه الدرس مفتوحاً",
    summary: "مساحة مخصصة للأعضاء ومحدودة بوضوح ومصممة لتقليل البيانات، لأسئلة الدروس والتأمل اليومي من دون ادعاء السلطة.",
    seoTitle: "Reflection Companion لأسئلة الأعضاء المتأنية",
    seoDescription: "اطرح أسئلة مرتبطة بالدروس في مساحة تأمل بالذكاء الاصطناعي محدودة ومصممة لحماية خصوصية الأعضاء.",
    heading: "قد يكون السؤال بداية للممارسة",
    intro: "قد يبقى الدرس معك لأنه فتح سؤالاً بدلاً من أن يغلقه. يمنح Reflection Companion الأعضاء الذين تم التحقق منهم مكاناً هادئاً لطرح السؤال التالي. يقدم منظوراً موجزاً وسؤالاً للتفكير وخطوة صغيرة قابلة للتنفيذ. لا يعلن حقيقة روحية ولا يرتب المعتقدات ولا يحل محل العلاقات الإنسانية أو الرعاية المهنية.",
    limits: "يحصل أعضاء Free وSeeker في كل يوم حسب التوقيت العالمي على جلسة واحدة مرتبطة بالدروس وثلاث مداخلات. يحصل أعضاء Initiate على ثلاث جلسات وأربع وعشرين مداخلة، مع وضع اختياري للتأمل في الحياة اليومية. تحمي الحدود موثوقية الخدمة والقدرة المشتركة، بينما يبقى معيار السلامة واحداً للجميع.",
    safety: "تبقى الأسئلة والإجابات في محادثة المتصفح النشطة ولا تحفظ في قاعدة بيانات التطبيق. يستدعى المزود من دون أدوات أو حالة مخزنة. تحد فحوصات الإدخال والإخراج وميزانيات الحساب والشبكة والجلسة والخدمة من حقن التعليمات والروبوتات ومزارع الحسابات والتكلفة غير المنضبطة. لا تحفظ إلا عدادات تشغيلية خالية من النص.",
    cta: "افتح Reflection Companion",
    faqQuestion: "هل يخبرني Reflection Companion بما يجب أن أؤمن به؟",
    faqAnswer: "لا. إنه يدعم التأمل والفهم، لكنه ليس سلطة دينية ولا يتخذ القرار نيابة عن العضو.",
  },
  ru: {
    title: "Знакомство с Reflection Companion: спросите о том, что урок оставил открытым",
    summary: "Доступное только участникам пространство с минимизацией данных и ясными ограничениями для вопросов об уроках и повседневной рефлексии без претензии на авторитет.",
    seoTitle: "Reflection Companion для вдумчивых вопросов",
    seoDescription: "Задавайте вопросы об уроках в ограниченном ИИ-пространстве рефлексии, созданном с учётом приватности участников.",
    heading: "Вопрос может стать началом практики",
    intro: "Урок может остаться с вами потому, что открыл вопрос, а не закрыл его. Reflection Companion даёт проверенным участникам спокойное место для следующего вопроса. Ответ содержит краткую точку зрения, вопрос для размышления и один небольшой практический шаг. Система не провозглашает духовную истину, не ранжирует убеждения и не заменяет человеческие отношения или профессиональную помощь.",
    limits: "Участники Free и Seeker получают в сутки UTC одну сессию по уроку и три сообщения. Initiate получает три сессии и двадцать четыре сообщения, а также дополнительный режим повседневной рефлексии. Ограничения защищают надёжность и общую ёмкость сервиса; стандарт безопасности одинаков для всех.",
    safety: "Вопросы и ответы остаются в активной беседе браузера и не записываются в базу данных приложения. Провайдер вызывается без инструментов и сохранённого состояния. Проверки входа и выхода, бюджеты аккаунта, сети, сессии и всего сервиса ограничивают инъекции, ботов, фермы аккаунтов и неконтролируемые расходы. Сохраняются только операционные счётчики без текста.",
    cta: "Открыть Reflection Companion",
    faqQuestion: "Может ли Reflection Companion сказать, во что мне верить?",
    faqAnswer: "Нет. Он помогает рефлексии и пониманию, но не является религиозным авторитетом и не решает за участника.",
  },
  zh: {
    title: "认识 Reflection Companion：追问课程留下的开放问题",
    summary: "这是一个仅供会员使用、默认减少数据并设有明确边界的空间，用于课程问答与日常反思，不自称权威。",
    seoTitle: "面向会员审慎提问的 Reflection Companion",
    seoDescription: "会员可在一个有用量边界、默认减少数据的人工智能反思空间中提出课程相关问题。",
    heading: "一个问题也可以成为练习的起点",
    intro: "一堂课之所以留在心里，有时不是因为它结束了问题，而是因为它打开了一个新问题。Reflection Companion 为已验证会员提供一个平静空间，用来提出这个后续问题。它会给出简短视角、一个值得继续思考的问题，以及一个规模很小的下一步。它不会宣称掌握精神真理，不会对信仰排序，也不能替代人与人的关系或专业支持。",
    limits: "Free 与 Seeker 会员每个 UTC 日可开启一次课程模式会话并使用三轮。Initiate 会员可开启三次会话并使用二十四轮，还可选择日常生活反思模式。限额用于保护服务可靠性与共享容量；所有会员获得相同的安全与审慎标准，不会因为套餐不同而降低答案安全。",
    safety: "问题与回答只保留在当前浏览器会话中，不写入应用数据库。调用模型时不开放工具，也不保存供应商会话状态。输入与输出都经过自动安全检查；账户、网络、会话及全局预算共同限制提示注入、机器人、批量账号与失控成本。系统只保留不含文本的运行计数，用于防止滥用和汇总改进。",
    cta: "打开 Reflection Companion",
    faqQuestion: "Reflection Companion 会告诉我应该相信什么吗？",
    faqAnswer: "不会。它帮助会员理解课程和进行反思，但不是宗教权威，也不会替会员作决定。",
  },
};

const SECTION_HEADINGS: Record<SupportedContentLocale, { members: string; safety: string }> = {
  en: { members: "What members receive", safety: "Safety and privacy by design" },
  tr: { members: "Üyeler ne alır?", safety: "Tasarımdan gelen güvenlik ve mahremiyet" },
  es: { members: "Qué reciben los miembros", safety: "Seguridad y privacidad desde el diseño" },
  de: { members: "Was Mitglieder erhalten", safety: "Sicherheit und Datenschutz im Design" },
  fr: { members: "Ce que reçoivent les membres", safety: "Sécurité et confidentialité dès la conception" },
  ar: { members: "ما الذي يحصل عليه الأعضاء", safety: "السلامة والخصوصية في صميم التصميم" },
  ru: { members: "Что получают участники", safety: "Безопасность и приватность по замыслу" },
  zh: { members: "会员可以获得什么", safety: "内置的安全与隐私边界" },
};

export function reflectionLaunchVariants(): LocalizedContentVariant[] {
  return SUPPORTED_CONTENT_LOCALES.map((locale) => {
    const base = buildFallbackVariant(locale);
    const copy = COPY[locale];
    const headings = SECTION_HEADINGS[locale];
    return {
      locale,
      title: copy.title,
      slug: `reflection-companion-${locale}-launch`,
      summary: copy.summary,
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
      bodyMarkdown: `## ${copy.heading}\n\n${copy.intro}\n\n## ${headings.members}\n\n${copy.limits}\n\n## ${headings.safety}\n\n${copy.safety}\n\n[${copy.cta}](${CAMPAIGN_URL})\n\n---\n\n${base.bodyMarkdown}`,
      faqBlocks: [
        { question: copy.faqQuestion, answer: copy.faqAnswer },
        ...base.faqBlocks,
      ],
      source: "owner",
    };
  });
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/(?:postgres(?:ql)?|https?):\/\/[^\s]+/gi, "[redacted-url]")
    .replace(/(?:sk|rk|whsec)_[A-Za-z0-9_-]+/g, "[redacted-secret]")
    .slice(0, 500);
}

export async function launchReflectionCompanionCampaign(now = new Date()) {
  const fingerprint = sha256Fingerprint([LAUNCH_VERSION]);
  const existing = await db.contentItem.findUnique({
    where: { fingerprint },
    select: { id: true, status: true, publishedAt: true },
  });
  if (existing) {
    return { created: false, duplicate: true, contentItem: existing };
  }

  const run = await db.agentRun.create({
    data: {
      agentName: "reflection-companion-launch",
      taskType: "PUBLISH_OWNER_APPROVED_PRODUCT_LAUNCH",
      status: AgentRunStatus.RUNNING,
      startedAt: now,
      input: json({
        trigger: "explicit-owner-command",
        launchVersion: LAUNCH_VERSION,
        containsPrivateText: false,
      }),
    },
    select: { id: true },
  });

  try {
    const variants = reflectionLaunchVariants();
    const gate = assessContentVariants(variants);
    if (gate.outcome !== ContentModerationOutcome.PASS) {
      throw new Error(`launch_content_gate_${gate.outcome.toLowerCase()}`);
    }

    const item = await db.$transaction(async (tx) => {
      const contentItem = await tx.contentItem.create({
        data: {
          fingerprint,
          canonicalTopic: "Reflection Companion launch",
          category: "product-education",
          contentType: "launch-guide",
          difficulty: "introductory",
          status: ContentWorkflowStatus.PUBLISHED,
          publishedAt: now,
          sourceSummary: json({
            source: "explicit-owner-command",
            privacy: "public-product-copy-only",
            containsPrivateText: false,
            launchVersion: LAUNCH_VERSION,
          }),
          publishabilityDecision: ContentModerationOutcome.PASS,
          aggregateMetrics: json({ qualityScore: gate.qualityScore, localeCoverage: variants.length }),
          agentRunId: run.id,
          variants: {
            create: variants.map((variant) => ({
              locale: variant.locale,
              title: variant.title,
              slug: variant.slug,
              summary: variant.summary,
              bodyMarkdown: variant.bodyMarkdown,
              seoTitle: variant.seoTitle,
              seoDescription: variant.seoDescription,
              faqBlocks: json(variant.faqBlocks),
              qualityScore: gate.localeScores[variant.locale],
              publishedAt: now,
            })),
          },
          sourceSignals: {
            create: {
              sourceType: "OWNER_APPROVED_PRODUCT_RELEASE",
              summary: "Scope-bound 2026-08-13 owner command to launch Reflection Companion and its bounded campaign.",
              weight: 100,
              metadata: json({ containsRawUserText: false, publicProductClaimsOnly: true }),
            },
          },
          moderationDecisions: {
            create: {
              agentRunId: run.id,
              outcome: ContentModerationOutcome.PASS,
              riskLevel: gate.riskLevel,
              reasons: json([...gate.reasons, "explicit_owner_launch_scope", "public_product_copy_only"]),
              qualityScores: json(gate.localeScores),
            },
          },
        },
        select: { id: true, status: true, publishedAt: true },
      });

      await tx.agentArtifact.create({
        data: {
          agentName: "reflection-companion-launch",
          artifactType: "PRODUCT_LAUNCH_RELEASE",
          fingerprint: sha256Fingerprint([LAUNCH_VERSION, "release-artifact"]),
          status: AgentArtifactStatus.READY,
          title: "Reflection Companion multilingual product launch",
          summary: "Owner-approved, independently gated launch release with eight public locale variants.",
          payload: json({
            launchVersion: LAUNCH_VERSION,
            localeCoverage: variants.length,
            contentItemId: contentItem.id,
            campaignUrl: CAMPAIGN_URL,
            containsPrivateText: false,
          }),
          sourceRefs: json({ contentItemId: contentItem.id }),
          qualityScore: gate.qualityScore,
          riskLevel: gate.riskLevel,
          agentRunId: run.id,
        },
      });
      return contentItem;
    });

    const completedAt = new Date();
    const output = {
      created: true,
      contentItemId: item.id,
      status: item.status,
      localeCoverage: variants.length,
      qualityScore: gate.qualityScore,
      campaignUrl: CAMPAIGN_URL,
      decisionLog: buildAgentDecisionLog({
        agentName: "reflection-companion-launch",
        action: "PUBLISH_OWNER_APPROVED_PRODUCT_LAUNCH",
        autonomyLevel: 3,
        allowedByPolicy: true,
        policyRule: "explicit-owner-command:2026-08-13:reflection-companion-launch",
        riskLevel: "LOW",
        escalated: false,
        inputSummary: "Owner-approved public product facts and eight deterministic locale variants; no member text.",
        outputSummary: "Published one idempotent multilingual content item and queued its release artifact.",
        occurredAt: completedAt.toISOString(),
      }),
    };
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.SUCCESS,
        completedAt,
        durationMs: Date.now() - now.getTime(),
        output: json(output),
      },
    });
    return { ...output, contentItem: item };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = safeError(error);
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: AgentRunStatus.FAILED,
        completedAt,
        durationMs: Date.now() - now.getTime(),
        errorMessage,
        output: json({
          failed: true,
          decisionLog: buildAgentDecisionLog({
            agentName: "reflection-companion-launch",
            action: "PUBLISH_OWNER_APPROVED_PRODUCT_LAUNCH",
            autonomyLevel: 3,
            allowedByPolicy: true,
            policyRule: "explicit-owner-command:2026-08-13:reflection-companion-launch",
            riskLevel: "MEDIUM",
            escalated: true,
            inputSummary: "Owner-approved public product facts only; no member text.",
            outputSummary: "Launch failed before completion; inspect the redacted AgentRun error.",
            occurredAt: completedAt.toISOString(),
          }),
        }),
      },
    });
    throw new Error(`reflection-companion-launch failed: ${errorMessage}`);
  }
}
