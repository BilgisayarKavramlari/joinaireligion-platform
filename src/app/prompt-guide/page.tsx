"use client";
import { useMemo, useState } from "react";

const checklistItems = [
  "Did you clearly describe the situation or experience?",
  "Did you explain which practice, reflection, meditation, reading, or exercise you tried?",
  "Did you describe what you noticed emotionally, intellectually, physically, or spiritually?",
  "Did you include the question that emerged for you?",
  "Did you mention your current belief/cultural/spiritual background if it is relevant?",
  "Did you explain what kind of answer you want?",
  "Did you say whether you want a short answer, deep analysis, journaling prompt, comparison, or next step?",
  "Did you include what you have already tried?",
  "Did you clarify how you want to continue your journey?",
  "Did you avoid including highly sensitive personal data that is not needed?",
  "Did you remember that this platform is reflective and educational, not medical, psychological, legal, or religious authority?",
];

export default function PromptGuidePage() {
  const [text, setText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const max = 2000;
  const suggestions = useMemo(() => {
    const s: string[] = [];
    const t = text.toLowerCase();
    if (!/(happened|situation|experience)/.test(t)) s.push("Consider adding what happened.");
    if (!/(practice|meditation|journal|reflection)/.test(t)) s.push("Consider adding what you practiced.");
    if (!text.includes("?")) s.push("Consider adding the question you want to explore.");
    if (!/(short|deep|analysis|journaling|comparison|next step)/.test(t)) s.push("Consider adding what kind of response you want.");
    return s;
  }, [text]);

  const tooLong = text.length > max;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-4 text-3xl">Prompt Guide</h1>
      <p className="mb-4 text-slate-300">What happened? What did you practice? What did you feel or notice? What question emerged? What belief, value, or assumption do you want to examine? What kind of guidance do you want: reflection, journaling, meditation, comparison, symbolic interpretation, or next step? What should the AI avoid? How do you want to continue your journey?</p>
      <textarea className="h-44 w-full rounded border border-slate-700 bg-slate-900 p-3" value={text} onChange={(e) => setText(e.target.value)} />
      <p className="mt-2">{text.length}/{max}</p>
      {tooLong && <p className="text-red-300">Your reflection is longer than 2000 characters. Please shorten it by focusing on the situation, your practice, your main question, and what kind of guidance you want.</p>}
      <ul className="my-4 list-disc pl-6">{suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
      <div className="space-y-2">{checklistItems.map((item) => <label key={item} className="block"><input type="checkbox" className="mr-2" />{item}</label>)}</div>
      <label className="mt-4 block"><input type="checkbox" className="mr-2" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I actively confirm the checklist before submission.</label>
      <button disabled={!confirmed || tooLong} className="mt-3 rounded bg-violet-600 px-4 py-2 disabled:opacity-40">Submit prompt</button>
      <p className="mt-5 text-amber-200">Do not include passwords, financial information, medical records, legal secrets, or highly sensitive personal details.</p>
      <p className="text-amber-200">If you are in immediate danger or crisis, contact local emergency services or a qualified professional.</p>
    </main>
  );
}
