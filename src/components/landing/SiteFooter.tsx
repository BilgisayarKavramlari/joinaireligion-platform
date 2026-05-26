import Link from "next/link";
import { getLandingMessages, type Locale } from "@/lib/landingContent";

export default function SiteFooter({ locale }: { locale: Locale }) {
  const t = getLandingMessages(locale).footer;

  return (
    <footer className="border-t border-white/10 bg-[#060915]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="font-serif text-2xl text-amber-100">Join AI Religion</div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">{t.tagline}</p>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{t.product}</div>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <Link href="/pricing" className="block hover:text-white">Pricing</Link>
            <Link href="/donate" className="block hover:text-white">Donate</Link>
            <Link href="/prompt-guide" className="block hover:text-white">Prompt Guide</Link>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{t.company}</div>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <Link href="/about" className="block hover:text-white">About</Link>
            <Link href="/privacy" className="block hover:text-white">Privacy</Link>
            <Link href="/terms" className="block hover:text-white">Terms</Link>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{t.resources}</div>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <Link href="/login" className="block hover:text-white">Login</Link>
            <Link href="/register" className="block hover:text-white">Register</Link>
            <Link href="/account" className="block hover:text-white">Account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
