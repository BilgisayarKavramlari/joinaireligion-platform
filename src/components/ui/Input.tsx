import type { InputHTMLAttributes } from "react";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-violet-400 ${props.className || ""}`} />; }
