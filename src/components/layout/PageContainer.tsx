import { ReactNode } from "react";
export function PageContainer({ children }: { children: ReactNode }) { return <main className="min-h-screen px-4 py-10 sm:px-6"><div className="mx-auto max-w-6xl">{children}</div></main>; }
