"use client";

import { motion } from "framer-motion";
import { getLandingMessages, type Locale } from "@/lib/landingContent";

const icons = ["✺", "✉", "△", "✒", "▣", "◎"];

export default function FeatureGrid({ locale }: { locale: Locale }) {
  const t = getLandingMessages(locale);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.35em] text-cyan-200">{t.featuresTitle}</div>
        <h2 className="mt-3 font-serif text-4xl text-white">{t.featuresSubtitle}</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {t.features.map(([title, text]: [string, string], index: number) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 80, scale: 0.9, rotateX: 8 }}
            whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: index * 0.08 }}
            className="feature-card"
          >
            <div className="feature-icon">{icons[index]}</div>
            <h3 className="mt-5 font-serif text-xl text-white">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
