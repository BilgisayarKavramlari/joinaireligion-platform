import type { SelectHTMLAttributes } from "react";
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white ${props.className || ""}`} />; }
