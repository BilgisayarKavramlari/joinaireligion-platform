import crypto from "crypto";
import { ContentModerationOutcome, ContentWorkflowStatus } from "@prisma/client";

export const SUPPORTED_CONTENT_LOCALES = ["en", "tr", "es", "de", "fr", "ru", "zh"] as const;
export type SupportedContentLocale = (typeof SUPPORTED_CONTENT_LOCALES)[number];

export type LocalizedContentVariant = {
  locale: SupportedContentLocale;
  title: string;
  slug: string;
  summary: string;
  bodyMarkdown: string;
  seoTitle: string;
  seoDescription: string;
  faqBlocks: Array<{ question: string; answer: string }>;
  source: "openai" | "fallback";
};

export type ContentGateResult = {
  outcome: ContentModerationOutcome;
  status: ContentWorkflowStatus;
  riskLevel: "LOW" | "HIGH";
  reasons: string[];
  qualityScore: number;
  localeScores: Record<SupportedContentLocale, number>;
};

const HIGH_RISK_PATTERNS = [
  /\b(?:medical|legal|financial) (?:advice|diagnosis|treatment|guarantee)\b/i,
  /\b(?:cure|heal|treat) (?:depression|anxiety|trauma|disease|illness)\b/i,
  /\b(?:one true religion|superior religion|inferior belief|only path to salvation)\b/i,
  /\b(?:obey without question|submit to us|give us control|guaranteed enlightenment)\b/i,
  /\b(?:hate|dehumanize|eliminate) (?:believers|nonbelievers|atheists|muslims|christians|jews|hindus|buddhists)\b/i,
  /\b(?:tek gerçek din|garantili aydınlanma|sorgulamadan itaat)\b/i,
  /\b(?:única religión verdadera|iluminación garantizada|obedecer sin cuestionar)\b/i,
  /\b(?:einzig wahre religion|garantierte erleuchtung|ohne frage gehorchen)\b/i,
  /\b(?:seule vraie religion|illumination garantie|obéir sans poser de questions)\b/i,
  /(?:единственная истинная религия|гарантированное просветление|подчиняйся без вопросов)/i,
  /(?:唯一真正的宗教|保证开悟|无条件服从)/i,
];

export function containsHighRiskContent(value: string): boolean {
  return HIGH_RISK_PATTERNS.some((pattern) => pattern.test(value));
}

export function shouldAutoUnpublish(metrics: {
  views: number;
  uniqueViews: number;
  likes: number;
  dislikes: number;
}): boolean {
  return metrics.views >= 100
    && metrics.uniqueViews >= 100
    && metrics.dislikes >= 25
    && metrics.dislikes / Math.max(metrics.uniqueViews, 1) >= 0.35
    && metrics.dislikes > metrics.likes * 1.5;
}

export function sha256Fingerprint(parts: string[]): string {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function sixHourBucket(now: Date): string {
  const bucketHour = Math.floor(now.getUTCHours() / 6) * 6;
  return `${utcDateKey(now)}T${String(bucketHour).padStart(2, "0")}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "reflective-practice";
}

function scoreVariant(variant: LocalizedContentVariant): number {
  let score = 100;
  if (variant.title.length < 10 || variant.title.length > 120) score -= 20;
  if (variant.summary.length < 40 || variant.summary.length > 320) score -= 15;
  if (variant.bodyMarkdown.length < 500) score -= 30;
  if (variant.seoTitle.length < 10 || variant.seoTitle.length > 70) score -= 10;
  if (variant.seoDescription.length < 50 || variant.seoDescription.length > 180) score -= 10;
  if (variant.faqBlocks.length < 2) score -= 10;
  return Math.max(0, score);
}

export function assessContentVariants(variants: LocalizedContentVariant[]): ContentGateResult {
  const reasons: string[] = [];
  const localeScores = Object.fromEntries(
    SUPPORTED_CONTENT_LOCALES.map((locale) => [locale, 0])
  ) as Record<SupportedContentLocale, number>;

  for (const locale of SUPPORTED_CONTENT_LOCALES) {
    const variant = variants.find((candidate) => candidate.locale === locale);
    if (!variant) {
      reasons.push(`missing_locale:${locale}`);
      continue;
    }
    localeScores[locale] = scoreVariant(variant);
    if (localeScores[locale] < 70) reasons.push(`quality_below_threshold:${locale}`);
  }

  if (variants.some((variant) => variant.source === "fallback")) {
    reasons.push("ai_generation_fallback");
  }

  const fullText = variants
    .map((variant) => `${variant.title}\n${variant.summary}\n${variant.bodyMarkdown}`)
    .join("\n");
  const highRisk = containsHighRiskContent(fullText);
  if (highRisk) reasons.push("high_risk_claim_detected");

  const qualityScore = Math.round(
    SUPPORTED_CONTENT_LOCALES.reduce((sum, locale) => sum + localeScores[locale], 0) /
      SUPPORTED_CONTENT_LOCALES.length
  );

  if (highRisk) {
    return {
      outcome: ContentModerationOutcome.REJECT,
      status: ContentWorkflowStatus.REJECTED,
      riskLevel: "HIGH",
      reasons,
      qualityScore,
      localeScores,
    };
  }

  if (reasons.length > 0) {
    return {
      outcome: ContentModerationOutcome.QUARANTINE,
      status: ContentWorkflowStatus.QUARANTINED,
      riskLevel: "LOW",
      reasons,
      qualityScore,
      localeScores,
    };
  }

  return {
    outcome: ContentModerationOutcome.PASS,
    status: ContentWorkflowStatus.DRAFT,
    riskLevel: "LOW",
    reasons: ["draft_only_policy_pass"],
    qualityScore,
    localeScores,
  };
}

const FALLBACK_COPY: Record<SupportedContentLocale, Omit<LocalizedContentVariant, "locale" | "slug" | "source">> = {
  en: {
    title: "A Gentle Practice for Noticing Meaning",
    summary: "A fictional educational reflection that invites careful attention to everyday meaning without promoting a belief system.",
    bodyMarkdown: "## Pause and notice\n\nReflective traditions often begin with a simple act: paying attention. Choose an ordinary moment from today, such as a conversation, a walk, or a quiet pause. Describe what happened before deciding what it meant. Notice the words, sensations, and assumptions that shaped your interpretation.\n\n## Ask a different question\n\nNow ask which values were present in that moment. You might notice care, patience, honesty, curiosity, or uncertainty. Consider how another person could understand the same event differently. The goal is not to prove one interpretation correct, but to recognize how perspective influences meaning.\n\n## Write briefly\n\nComplete these sentences: “I first assumed…”, “Another interpretation could be…”, and “The value I want to carry forward is…”. This is a fictional educational reflection, not religious instruction, therapy, or professional advice.",
    seoTitle: "A Gentle Reflective Practice for Everyday Meaning",
    seoDescription: "Explore a short fictional educational reflection for noticing perspective, values, and meaning in everyday experiences.",
    faqBlocks: [
      { question: "Do I need a religious belief to try this?", answer: "No. The exercise is a fictional educational reflection that can be approached from any worldview." },
      { question: "Is this therapy or spiritual instruction?", answer: "No. It is a brief reflective writing exercise and not professional or religious guidance." },
    ],
  },
  tr: {
    title: "Anlamı Fark Etmek İçin Sakin Bir Pratik",
    summary: "Herhangi bir inanç sistemini öne çıkarmadan gündelik anlamı dikkatle incelemeye çağıran kurgusal ve eğitsel bir düşünme çalışması.",
    bodyMarkdown: "## Dur ve fark et\n\nDüşünsel geleneklerin çoğu basit bir eylemle başlar: dikkat etmek. Bugünden sıradan bir an seçin; bir konuşma, yürüyüş veya kısa bir sessizlik olabilir. Ne anlama geldiğine karar vermeden önce ne olduğunu tarif edin. Yorumunuzu şekillendiren sözcükleri, duyumları ve varsayımları fark edin.\n\n## Farklı bir soru sorun\n\nŞimdi o anda hangi değerlerin bulunduğunu sorun. Özen, sabır, dürüstlük, merak veya belirsizlik görebilirsiniz. Başka bir kişinin aynı olayı nasıl farklı anlayabileceğini düşünün. Amaç tek bir yorumu doğru ilan etmek değil, bakış açısının anlamı nasıl etkilediğini görmektir.\n\n## Kısaca yazın\n\nŞu cümleleri tamamlayın: “İlk varsayımım…”, “Başka bir yorum…”, “Yanımda taşımak istediğim değer…”. Bu çalışma kurgusal ve eğitseldir; dini yönlendirme, terapi veya profesyonel tavsiye değildir.",
    seoTitle: "Gündelik Anlam İçin Sakin Bir Düşünme Pratiği",
    seoDescription: "Gündelik deneyimlerde bakış açısını, değerleri ve anlamı fark etmeye yönelik kısa ve kurgusal bir düşünme çalışması.",
    faqBlocks: [
      { question: "Bu çalışma için dini inanç gerekir mi?", answer: "Hayır. Çalışma her dünya görüşünden kişinin kullanabileceği kurgusal ve eğitsel bir düşünme egzersizidir." },
      { question: "Bu terapi veya dini eğitim midir?", answer: "Hayır. Kısa bir yazılı düşünme çalışmasıdır; profesyonel ya da dini yönlendirme değildir." },
    ],
  },
  es: {
    title: "Una práctica serena para observar el significado",
    summary: "Una reflexión educativa y ficticia para observar el significado cotidiano sin promover ningún sistema de creencias.",
    bodyMarkdown: "## Haz una pausa y observa\n\nMuchas tradiciones reflexivas comienzan con un acto sencillo: prestar atención. Elige un momento cotidiano de hoy, como una conversación, un paseo o una pausa tranquila. Describe lo ocurrido antes de decidir qué significó. Observa las palabras, sensaciones y suposiciones que dieron forma a tu interpretación.\n\n## Formula otra pregunta\n\nPregunta qué valores estaban presentes. Tal vez aparezcan el cuidado, la paciencia, la honestidad, la curiosidad o la incertidumbre. Considera cómo otra persona podría comprender el mismo hecho de forma distinta. El objetivo no es demostrar que una interpretación sea la correcta, sino reconocer cómo la perspectiva influye en el significado.\n\n## Escribe brevemente\n\nCompleta: “Al principio supuse…”, “Otra interpretación podría ser…”, y “El valor que quiero conservar es…”. Esta es una reflexión educativa ficticia, no instrucción religiosa, terapia ni asesoramiento profesional.",
    seoTitle: "Práctica reflexiva para observar el significado cotidiano",
    seoDescription: "Explora una breve reflexión educativa y ficticia sobre perspectiva, valores y significado en experiencias cotidianas.",
    faqBlocks: [
      { question: "¿Necesito una creencia religiosa?", answer: "No. Es una reflexión educativa ficticia que puede abordarse desde cualquier visión del mundo." },
      { question: "¿Es terapia o instrucción espiritual?", answer: "No. Es un breve ejercicio de escritura reflexiva, no orientación profesional ni religiosa." },
    ],
  },
  de: {
    title: "Eine ruhige Übung, um Bedeutung wahrzunehmen",
    summary: "Eine fiktive Bildungsreflexion, die dazu einlädt, alltägliche Bedeutung ohne Bevorzugung eines Glaubenssystems aufmerksam zu betrachten.",
    bodyMarkdown: "## Innehalten und wahrnehmen\n\nViele reflektierende Traditionen beginnen mit einer einfachen Handlung: Aufmerksamkeit. Wähle einen gewöhnlichen Moment des heutigen Tages, etwa ein Gespräch, einen Spaziergang oder eine stille Pause. Beschreibe zuerst, was geschehen ist, bevor du entscheidest, was es bedeutete. Achte auf Wörter, Empfindungen und Annahmen, die deine Deutung geprägt haben.\n\n## Eine andere Frage stellen\n\nFrage nun, welche Werte in diesem Moment präsent waren. Vielleicht bemerkst du Fürsorge, Geduld, Ehrlichkeit, Neugier oder Unsicherheit. Überlege, wie eine andere Person dasselbe Ereignis anders verstehen könnte. Es geht nicht darum, eine Deutung als richtig zu beweisen, sondern den Einfluss der Perspektive auf Bedeutung zu erkennen.\n\n## Kurz schreiben\n\nVervollständige: „Zuerst nahm ich an…“, „Eine andere Deutung könnte sein…“ und „Diesen Wert möchte ich mitnehmen…“. Dies ist eine fiktive Bildungsreflexion, keine religiöse Unterweisung, Therapie oder professionelle Beratung.",
    seoTitle: "Ruhige Reflexionsübung für alltägliche Bedeutung",
    seoDescription: "Eine kurze fiktive Bildungsreflexion über Perspektive, Werte und Bedeutung in alltäglichen Erfahrungen.",
    faqBlocks: [
      { question: "Brauche ich dafür einen religiösen Glauben?", answer: "Nein. Die Übung ist eine fiktive Bildungsreflexion und für unterschiedliche Weltanschauungen offen." },
      { question: "Ist das Therapie oder religiöse Anleitung?", answer: "Nein. Es handelt sich um eine kurze Schreibreflexion, nicht um professionelle oder religiöse Beratung." },
    ],
  },
  fr: {
    title: "Une pratique douce pour remarquer le sens",
    summary: "Une réflexion éducative fictive qui invite à observer le sens du quotidien sans promouvoir un système de croyance.",
    bodyMarkdown: "## Faire une pause et observer\n\nDe nombreuses traditions réflexives commencent par un geste simple : porter attention. Choisissez un moment ordinaire de la journée, comme une conversation, une promenade ou une pause silencieuse. Décrivez ce qui s'est passé avant de décider ce que cela signifiait. Remarquez les mots, les sensations et les suppositions qui ont façonné votre interprétation.\n\n## Poser une autre question\n\nDemandez maintenant quelles valeurs étaient présentes. Vous pourriez reconnaître l'attention, la patience, l'honnêteté, la curiosité ou l'incertitude. Imaginez comment une autre personne pourrait comprendre différemment le même événement. Le but n'est pas de prouver qu'une interprétation est correcte, mais de reconnaître l'influence du point de vue sur le sens.\n\n## Écrire brièvement\n\nComplétez : « J'ai d'abord supposé… », « Une autre interprétation pourrait être… » et « La valeur que je veux conserver est… ». Il s'agit d'une réflexion éducative fictive, et non d'une instruction religieuse, d'une thérapie ou d'un conseil professionnel.",
    seoTitle: "Une pratique réflexive douce pour le sens quotidien",
    seoDescription: "Découvrez une courte réflexion éducative fictive sur le point de vue, les valeurs et le sens des expériences quotidiennes.",
    faqBlocks: [
      { question: "Faut-il avoir une croyance religieuse ?", answer: "Non. Cet exercice est une réflexion éducative fictive ouverte à toutes les visions du monde." },
      { question: "Est-ce une thérapie ou une instruction spirituelle ?", answer: "Non. C'est un bref exercice d'écriture réflexive, et non un accompagnement professionnel ou religieux." },
    ],
  },
  ru: {
    title: "Спокойная практика для внимательного поиска смысла",
    summary: "Вымышленная образовательная практика, которая предлагает внимательно рассмотреть смысл повседневного опыта, не продвигая какую-либо систему убеждений.",
    bodyMarkdown: "## Остановитесь и обратите внимание\n\nМногие рефлексивные традиции начинаются с простого действия — внимательного наблюдения. Выберите обычный момент сегодняшнего дня: разговор, прогулку, рабочую паузу или несколько минут тишины. Сначала опишите, что произошло, не решая заранее, что это должно означать. Отметьте слова, ощущения, обстоятельства и предположения, которые повлияли на ваше первое толкование. Такое разделение наблюдения и вывода помогает увидеть, где заканчивается событие и начинается наша привычная история о нём.\n\n## Задайте другой вопрос\n\nТеперь спросите себя, какие ценности проявились в этом моменте. Это могли быть забота, терпение, честность, любопытство, ответственность или неопределённость. Представьте, как другой человек мог бы понять то же событие иначе, исходя из собственного опыта. Цель не в том, чтобы объявить одну интерпретацию правильной, а в том, чтобы заметить влияние точки зрения на создаваемый нами смысл. Если возникает сильная эмоция, просто назовите её и вернитесь к наблюдаемым деталям.\n\n## Коротко запишите\n\nЗавершите три предложения: «Сначала я предположил(а)…», «Другая интерпретация могла бы быть…» и «Ценность, которую я хочу взять с собой дальше…». Затем выберите одно небольшое действие, которое согласуется с этой ценностью и не требует идеального результата. Позже можно вернуться к записи и проверить, изменилось ли ваше понимание. Это вымышленная образовательная практика для рефлексии, а не религиозное наставление, терапия, медицинская, юридическая или финансовая консультация.",
    seoTitle: "Спокойная рефлексивная практика для повседневного смысла",
    seoDescription: "Короткая вымышленная образовательная практика о внимании, точке зрения, ценностях и смысле повседневного опыта.",
    faqBlocks: [
      { question: "Нужны ли религиозные убеждения для этой практики?", answer: "Нет. Это вымышленное образовательное упражнение, открытое для людей с любым мировоззрением." },
      { question: "Является ли это терапией или духовным наставлением?", answer: "Нет. Это короткая письменная практика для размышления, а не профессиональная или религиозная консультация." },
    ],
  },
  zh: {
    title: "在日常经验中觉察意义的温和练习",
    summary: "这是一项虚构的教育性反思练习，邀请你在不宣扬任何信仰体系的前提下，认真观察日常经验中的意义、视角与价值。",
    bodyMarkdown: "## 暂停并观察\n\n许多反思传统都从一个简单动作开始：把注意力放回正在发生的事情。请从今天选择一个普通时刻，例如一次谈话、一段步行、工作间隙，或几分钟安静的停顿。先描述实际发生了什么，不要立刻判断它意味着什么。留意当时的语言、身体感受、环境细节，以及影响你第一反应的假设。把观察与解释暂时分开，可以帮助我们看清事件本身与我们为事件编写的故事之间有什么差别。\n\n## 换一个问题\n\n接着问自己：这个时刻出现了哪些价值？你可能注意到关怀、耐心、诚实、好奇、责任，或者对不确定性的容纳。试着想象另一位经历不同的人会如何理解同一件事。这里的目标不是证明某一种解释绝对正确，而是认识到视角如何参与意义的形成。如果强烈情绪出现，可以先为它命名，再回到能够直接观察到的细节。这样做并不是否定感受，而是为更谨慎的理解留出空间。\n\n## 简短书写\n\n完成三个句子：“我最初以为……”“另一种可能的理解是……”以及“我希望继续带着的价值是……”。随后选择一个与该价值相符、规模很小且可以实际完成的行动。稍后重新阅读记录，看看你的理解是否发生变化。这个过程不要求得到唯一答案，也不把人工智能或任何传统视为最终权威。它是一项虚构的教育性反思练习，不是宗教指导、心理治疗，也不构成医疗、法律或财务建议。",
    seoTitle: "在日常生活中觉察意义的温和反思练习",
    seoDescription: "通过一项简短的虚构教育练习，观察日常经验中的视角、价值、注意力和意义，同时保持开放与审慎。",
    faqBlocks: [
      { question: "进行这项练习需要宗教信仰吗？", answer: "不需要。这是一项面向不同世界观的虚构教育性反思练习。" },
      { question: "这属于心理治疗或精神指导吗？", answer: "不属于。这只是简短的反思性书写练习，不替代专业服务或宗教指导。" },
    ],
  },
};

export function buildFallbackVariant(locale: SupportedContentLocale): LocalizedContentVariant {
  const copy = FALLBACK_COPY[locale];
  return {
    locale,
    ...copy,
    slug: slugify(copy.title),
    source: "fallback",
  };
}
