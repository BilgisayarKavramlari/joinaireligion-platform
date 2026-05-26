"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import MouseSpotlight from "@/components/landing/MouseSpotlight";
import PremiumHeader, { useLandingLocale } from "@/components/landing/PremiumHeader";
import JourneyConsole from "@/components/landing/JourneyConsole";
import FeatureGrid from "@/components/landing/FeatureGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import SiteFooter from "@/components/landing/SiteFooter";
import { getLandingMessages } from "@/lib/landingContent";

export default function HomePage() {
  const [locale, setLocale] = useLandingLocale();
  const t = getLandingMessages(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <MouseSpotlight />
      <PremiumHeader locale={locale} setLocale={setLocale} />

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
            style={{ backgroundImage: "url('/images/landing-background-sacred.jpg')" }}
          />
          <div className="absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
          <div className="absolute right-[-100px] top-[180px] h-[380px] w-[380px] rounded-full bg-cyan-500/12 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:82px_82px]" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-24 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <div className="text-xs uppercase tracking-[0.38em] text-amber-200">
              {t.hero.eyebrow}
            </div>

            <h1 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              {t.hero.title}
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              {t.hero.subtitle}
            </p>

            <div className="mt-6 max-w-2xl rounded-2xl border border-amber-200/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100">
              {t.hero.warning}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/register" className="primary-btn">
                {t.hero.ctaPrimary}
              </Link>
              <Link href="/pricing" className="secondary-btn">
                {t.hero.ctaSecondary}
              </Link>
              <Link href="/donate" className="gold-btn">
                {t.hero.ctaDonate}
              </Link>
            </div>
          </motion.div>

          <JourneyConsole locale={locale} />
        </div>
      </section>

      <FeatureGrid locale={locale} />
      <HowItWorks locale={locale} />

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-violet-200/20 bg-gradient-to-r from-violet-950/70 via-slate-950 to-cyan-950/60 p-8 text-center shadow-2xl shadow-black/40">
          <h2 className="font-serif text-4xl text-white sm:text-5xl">
            {t.cta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            {t.cta.subtitle}
          </p>
          <Link href="/register" className="primary-btn mt-8 inline-flex">
            {t.cta.button}
          </Link>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
