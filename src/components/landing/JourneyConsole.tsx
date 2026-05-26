"use client";

import { motion } from "framer-motion";
import { getLandingMessages, type Locale } from "@/lib/landingContent";

export default function JourneyConsole({ locale }: { locale: Locale }) {
  const t = getLandingMessages(locale).console;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0f1f]/80 p-6 shadow-2xl shadow-violet-950/30 backdrop-blur-2xl"
    >
      <div className="absolute inset-0 bg-[url('/images/hero-sacred-bg.jpg')] bg-cover bg-center opacity-[0.08]" />
      <div className="absolute -top-24 right-[-3rem] h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="absolute -bottom-20 left-[-2rem] h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.35em] text-amber-200">
            {t.title}
          </div>
          <div className="text-slate-500">✦</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="text-sm text-slate-400">Current archetype</div>
            <div className="mt-2 font-serif text-4xl text-white">{t.levelName}</div>
            <div className="mt-1 text-sm text-slate-500">{t.level}</div>

            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-2 w-[65%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" />
            </div>
            <div className="mt-2 text-sm text-slate-400">{t.xp}</div>

            <div className="mt-6 rounded-2xl border border-amber-200/15 bg-amber-200/[0.05] p-4 text-sm italic text-amber-100">
              “{t.quote}”
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm text-slate-400">Journey path</div>
            <div className="mt-4 space-y-3">
              {t.path.map((step: string, index: number) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-violet-200/20 bg-violet-500/10 text-xs text-violet-100">
                    {index + 1}
                  </span>
                  <span className="text-slate-200">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.stats.map(([value, label]: [string, string]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
