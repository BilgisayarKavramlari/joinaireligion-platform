export const CONTENT_COPY = {
  en: { label: "Living Library", title: "Insights & Reflections", intro: "Automatically researched, independently reviewed, multilingual educational reflections. Every published item passes the platform’s quality and safety gates.", empty: "The first independently reviewed reflection is being prepared.", allInsights: "All insights", questions: "Questions", views: "views", useful: "useful" },
  tr: { label: "Yaşayan Külliyat", title: "İçgörüler ve Düşünceler", intro: "Otomatik araştırılan, bağımsız biçimde denetlenen, çok dilli eğitsel düşünce yazıları. Yayınlanan her içerik kalite ve güvenlik kontrollerinden geçer.", empty: "Bağımsız olarak denetlenen ilk yazı hazırlanıyor.", allInsights: "Tüm içgörüler", questions: "Sorular", views: "görüntülenme", useful: "faydalı" },
  es: { label: "Biblioteca viva", title: "Ideas y reflexiones", intro: "Reflexiones educativas multilingües, investigadas automáticamente y revisadas de forma independiente. Cada publicación supera controles de calidad y seguridad.", empty: "Se está preparando la primera reflexión revisada.", allInsights: "Todas las reflexiones", questions: "Preguntas", views: "vistas", useful: "útil" },
  de: { label: "Lebendige Bibliothek", title: "Einsichten und Reflexionen", intro: "Automatisch recherchierte, unabhängig geprüfte, mehrsprachige Bildungsreflexionen. Jeder veröffentlichte Beitrag durchläuft Qualitäts- und Sicherheitsprüfungen.", empty: "Die erste unabhängig geprüfte Reflexion wird vorbereitet.", allInsights: "Alle Einsichten", questions: "Fragen", views: "Aufrufe", useful: "hilfreich" },
  fr: { label: "Bibliothèque vivante", title: "Éclairages et réflexions", intro: "Des réflexions éducatives multilingues, recherchées automatiquement et contrôlées indépendamment. Chaque publication passe des contrôles de qualité et de sécurité.", empty: "La première réflexion contrôlée est en préparation.", allInsights: "Toutes les réflexions", questions: "Questions", views: "vues", useful: "utile" },
  ru: { label: "Живая библиотека", title: "Идеи и размышления", intro: "Многоязычные образовательные материалы, автоматически подготовленные и независимо проверенные. Каждая публикация проходит проверку качества и безопасности.", empty: "Первая независимо проверенная публикация готовится.", allInsights: "Все материалы", questions: "Вопросы", views: "просмотров", useful: "полезно" },
  zh: { label: "生长中的知识库", title: "洞见与思考", intro: "经自动研究、独立审核的多语言教育性思考内容。每篇发布内容都通过质量与安全检查。", empty: "首篇独立审核的思考文章正在准备中。", allInsights: "全部洞见", questions: "问题", views: "次浏览", useful: "有帮助" },
} as const;

export type ContentCopyLocale = keyof typeof CONTENT_COPY;

export function getContentCopy(locale: string) {
  return CONTENT_COPY[locale as ContentCopyLocale] || CONTENT_COPY.en;
}
