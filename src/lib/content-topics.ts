export const TOPIC_CLUSTERS = [
  {
    slug: "meaning-and-attention",
    title: "Meaning & Attention",
    description: "Practical ways to notice attention, uncertainty, and meaning in ordinary life.",
    categories: ["reflection", "meditation"],
  },
  {
    slug: "reflective-practice",
    title: "Reflective Practice",
    description: "Journaling, values, listening, and repeatable practices for thoughtful self-inquiry.",
    categories: ["journaling", "values"],
  },
  {
    slug: "cross-cultural-literacy",
    title: "Cross-cultural Literacy",
    description: "Context-aware approaches to traditions, symbols, rituals, and respectful curiosity.",
    categories: ["comparative_culture"],
  },
  {
    slug: "responsible-ai",
    title: "Responsible AI & Meaning",
    description: "Clear boundaries for using AI as a reflective prompt without granting it authority.",
    categories: ["responsible_ai"],
  },
] as const;

export type TopicClusterSlug = (typeof TOPIC_CLUSTERS)[number]["slug"];

export const CONTENT_TOPICS = [
  { key: "everyday-meaning", title: "Noticing meaning in everyday moments", category: "reflection", contentType: "guided_reflection", cluster: "meaning-and-attention" },
  { key: "meditation-attention", title: "Meditation as a cross-cultural attention practice", category: "meditation", contentType: "educational_article", cluster: "meaning-and-attention" },
  { key: "attention-and-choice", title: "How attention shapes everyday choices", category: "reflection", contentType: "educational_article", cluster: "meaning-and-attention" },
  { key: "digital-pause", title: "A short digital pause for more deliberate attention", category: "meditation", contentType: "guided_reflection", cluster: "meaning-and-attention" },
  { key: "curiosity-before-certainty", title: "Practicing curiosity before certainty", category: "reflection", contentType: "guided_reflection", cluster: "meaning-and-attention" },
  { key: "beginner-meditation", title: "A beginner-friendly attention exercise without spiritual claims", category: "meditation", contentType: "guided_reflection", cluster: "meaning-and-attention" },
  { key: "meaningful-questions", title: "What makes a reflective question meaningful", category: "reflection", contentType: "faq", cluster: "meaning-and-attention" },

  { key: "journaling-perspective", title: "Reflective journaling and the role of perspective", category: "journaling", contentType: "educational_article", cluster: "reflective-practice" },
  { key: "values-in-action", title: "Questions for noticing personal values in action", category: "values", contentType: "guided_reflection", cluster: "reflective-practice" },
  { key: "journaling-uncertainty", title: "Journaling with uncertainty instead of rushing to answers", category: "journaling", contentType: "guided_reflection", cluster: "reflective-practice" },
  { key: "questions-for-values", title: "Five questions for clarifying values without judging beliefs", category: "values", contentType: "faq", cluster: "reflective-practice" },
  { key: "journaling-patterns", title: "Using journaling to notice recurring patterns", category: "journaling", contentType: "educational_article", cluster: "reflective-practice" },
  { key: "listening-practice", title: "A reflective listening practice for difficult conversations", category: "values", contentType: "guided_reflection", cluster: "reflective-practice" },
  { key: "values-conflict", title: "Reflecting when two personal values seem to conflict", category: "values", contentType: "guided_reflection", cluster: "reflective-practice" },

  { key: "respectful-curiosity", title: "Approaching unfamiliar traditions with respectful curiosity", category: "comparative_culture", contentType: "faq", cluster: "cross-cultural-literacy" },
  { key: "ritual-and-routine", title: "The difference between reflective ritual and routine", category: "comparative_culture", contentType: "educational_article", cluster: "cross-cultural-literacy" },
  { key: "symbols-and-meaning", title: "How symbols can support personal reflection", category: "comparative_culture", contentType: "educational_article", cluster: "cross-cultural-literacy" },
  { key: "cross-cultural-care", title: "Reading cross-cultural practices with context and care", category: "comparative_culture", contentType: "educational_article", cluster: "cross-cultural-literacy" },

  { key: "technology-and-meaning", title: "Using AI as a prompt for reflection without giving it authority", category: "responsible_ai", contentType: "faq", cluster: "responsible-ai" },
  { key: "responsible-ai-reflection", title: "Boundaries for responsible AI-guided reflection", category: "responsible_ai", contentType: "educational_article", cluster: "responsible-ai" },
  { key: "ai-and-uncertainty", title: "What AI cannot know about a person's inner experience", category: "responsible_ai", contentType: "educational_article", cluster: "responsible-ai" },
  { key: "ai-reflection-checklist", title: "A safety checklist for AI-assisted reflective writing", category: "responsible_ai", contentType: "guided_reflection", cluster: "responsible-ai" },
] as const;

export type ContentTopic = (typeof CONTENT_TOPICS)[number];

export function getTopicCluster(slug: string) {
  return TOPIC_CLUSTERS.find((cluster) => cluster.slug === slug) ?? null;
}

export function getTopicClusterForCategory(category: string) {
  return TOPIC_CLUSTERS.find((cluster) => (cluster.categories as readonly string[]).includes(category)) ?? null;
}
