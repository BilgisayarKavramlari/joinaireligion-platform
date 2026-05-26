"use client";

import { motion } from "framer-motion";
import { getLandingMessages, type Locale } from "@/lib/landingContent";

export default function HowItWorks({ locale }: { locale: Locale }) {
  const t = getLandingMessages(locale).how;

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <div className="text-xs uppercase tracking-[0.35em] text-amber-200">{t.title}</div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {t.steps.map(([title, text]: [string, string], index: number) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/20"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/15 text-violet-100">
                {index + 1}
              </div>
              <div className="font-serif text-lg text-white">{title}</div>
            </div>
            <p className="text-sm leading-7 text-slate-400">{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
