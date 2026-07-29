"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type PublicSubscription = {
  status: string;
  plan: "seeker" | "initiate" | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
};

export type PublicProfile = {
  bio: string | null;
  tradition: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  secondaryEmail: string | null;
  socialMedia: Record<string, string> | null;
  avatarPath: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  emailVerifiedAt: string | null;
  currentLevel: number;
  xpTotal: number;
  daysActive: number;
  onboardingDone: boolean;
  requiresOnboarding: boolean;
  unsubscribedAt: string | null;
  avatarUrl: string | null;
  profile: PublicProfile | null;
  subscription: PublicSubscription | null;
};

export type SessionStatus = "loading" | "authenticated" | "anonymous" | "error";

type SessionContextValue = {
  user: SessionUser | null;
  status: SessionStatus;
  error: string | null;
  refreshSession: () => Promise<SessionUser | null>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Keep malformed or unexpectedly broad API responses out of application state.
 * The API owns the complete DTO; the client only requires stable identity fields
 * before accepting it as an authenticated session.
 */
export function readSessionUser(payload: unknown): SessionUser | null {
  if (!payload || typeof payload !== "object") return null;
  const user = (payload as { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;

  const candidate = user as Partial<SessionUser>;
  if (typeof candidate.id !== "string" || typeof candidate.email !== "string") return null;
  return candidate as SessionUser;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const lastKnownUser = useRef<SessionUser | null>(null);

  const refreshSession = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus((current) => (current === "authenticated" ? current : "loading"));
    setError(null);

    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (version !== requestVersion.current) return null;

      if (response.status === 401) {
        lastKnownUser.current = null;
        setUser(null);
        setStatus("anonymous");
        return null;
      }

      if (!response.ok) throw new Error(`Session request failed (${response.status})`);

      const nextUser = readSessionUser(await response.json());
      if (!nextUser) throw new Error("Session response was invalid");

      lastKnownUser.current = nextUser;
      setUser(nextUser);
      setStatus("authenticated");
      return nextUser;
    } catch (cause) {
      if (version !== requestVersion.current) return null;
      setError(cause instanceof Error ? cause.message : "Session request failed");
      setStatus(lastKnownUser.current ? "authenticated" : "error");
      return lastKnownUser.current;
    }
  }, []);

  const clearSession = useCallback(() => {
    requestVersion.current += 1;
    lastKnownUser.current = null;
    setUser(null);
    setError(null);
    setStatus("anonymous");
  }, []);

  // The root layout survives client navigation. Refreshing on path changes keeps
  // login, logout, verification, and onboarding transitions consistent without
  // every page maintaining its own header session state.
  useEffect(() => {
    void refreshSession();
  }, [pathname, refreshSession]);

  const value = useMemo(
    () => ({ user, status, error, refreshSession, clearSession }),
    [user, status, error, refreshSession, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within <SessionProvider>");
  return context;
}
