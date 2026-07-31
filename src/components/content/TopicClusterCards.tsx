"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

type Cluster = { slug: string; title: string; description: string; count?: number };
type Item = {
  id: string;
  category: string;
  variants: Array<{ id: string; locale: string; slug: string; title: string; summary: string }>;
};

const COPY: Record<string, { eyebrow: string; title: string; intro: string; articles: string; explore: string; back: string }> = {
  en: { eyebrow: "Topic clusters", title: "Explore connected questions", intro: "Follow a theme across related, multilingual reflections.", articles: "articles", explore: "Explore cluster", back: "All topic clusters" },
  tr: { eyebrow: "Konu kümeleri", title: "Bağlantılı soruları keşfedin", intro: "Bir temayı ilişkili, çok dilli düşünme yazıları boyunca izleyin.", articles: "yazı", explore: "Kümeyi keşfet", back: "Tüm konu kümeleri" },
  es: { eyebrow: "Grupos temáticos", title: "Explora preguntas conectadas", intro: "Sigue un tema entre reflexiones relacionadas y multilingües.", articles: "artículos", explore: "Explorar grupo", back: "Todos los grupos" },
  de: { eyebrow: "Themencluster", title: "Verbundene Fragen erkunden", intro: "Verfolge ein Thema durch verwandte mehrsprachige Reflexionen.", articles: "Artikel", explore: "Cluster erkunden", back: "Alle Themencluster" },
  fr: { eyebrow: "Groupes thématiques", title: "Explorer des questions reliées", intro: "Suivez un thème à travers des réflexions multilingues liées.", articles: "articles", explore: "Explorer le groupe", back: "Tous les groupes" },
  ar: { eyebrow: "مجموعات موضوعية", title: "استكشف أسئلة مترابطة", intro: "تتبّع موضوعاً عبر تأملات مترابطة ومتعددة اللغات.", articles: "مقالات", explore: "استكشف المجموعة", back: "كل المجموعات" },
  ru: { eyebrow: "Тематические кластеры", title: "Исследуйте связанные вопросы", intro: "Прослеживайте тему в связанных многоязычных материалах.", articles: "статей", explore: "Открыть кластер", back: "Все кластеры" },
  zh: { eyebrow: "主题集群", title: "探索相互关联的问题", intro: "通过相关的多语言反思内容持续探索一个主题。", articles: "篇文章", explore: "探索主题", back: "全部主题" },
};

export function TopicClusterCards({ clusters }: { clusters: Cluster[] }) {
  const { lang } = useLanguage();
  const copy = COPY[lang] ?? COPY.en;
  return (
    <main className="topic-hub-shell">
      <div className="topic-hub-inner">
        <p className="topic-hub-eyebrow">{copy.eyebrow}</p>
        <h1 className="font-sacred topic-hub-title">{copy.title}</h1>
        <p className="topic-hub-intro">{copy.intro}</p>
        <div className="topic-cluster-grid">
          {clusters.map((cluster, index) => (
            <article key={cluster.slug} className="sacred-card topic-cluster-card">
              <span className="topic-cluster-number">0{index + 1}</span>
              <h2 className="font-sacred">{cluster.title}</h2>
              <p>{cluster.description}</p>
              <div className="topic-cluster-footer">
                <small>{cluster.count ?? 0} {copy.articles}</small>
                <Link href={`/content/topics/${cluster.slug}`}>{copy.explore} →</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export function TopicClusterArticles({ cluster, items }: { cluster: Cluster; items: Item[] }) {
  const { lang } = useLanguage();
  const copy = COPY[lang] ?? COPY.en;
  return (
    <main className="topic-hub-shell">
      <div className="topic-hub-inner">
        <Link href="/content/topics" className="topic-hub-back">← {copy.back}</Link>
        <p className="topic-hub-eyebrow">{copy.eyebrow}</p>
        <h1 className="font-sacred topic-hub-title">{cluster.title}</h1>
        <p className="topic-hub-intro">{cluster.description}</p>
        <div className="topic-article-list">
          {items.map((item) => {
            const primary = item.variants.find((variant) => variant.locale === lang)
              ?? item.variants.find((variant) => variant.locale === "en")
              ?? item.variants[0];
            if (!primary) return null;
            return (
              <article key={item.id} className="sacred-card topic-article-card">
                <p className="topic-article-category">{item.category.replaceAll("_", " ")}</p>
                <h2 className="font-sacred"><Link href={`/content/${primary.locale}/${primary.slug}`}>{primary.title}</Link></h2>
                <p>{primary.summary}</p>
                <div className="topic-locale-links">
                  {item.variants.map((variant) => <Link key={variant.id} href={`/content/${variant.locale}/${variant.slug}`}>{variant.locale.toUpperCase()}</Link>)}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
