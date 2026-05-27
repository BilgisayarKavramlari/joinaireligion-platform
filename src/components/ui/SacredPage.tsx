import { CSSProperties, ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from "react";

/** Sayfa geneli sacred-game teması wrapper'ı */
export function SacredPage({ children, maxWidth = 900 }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Ambient nebula */}
      <div aria-hidden style={{
        position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)",
        width: 900, height: 500,
        background: "radial-gradient(ellipse, rgba(107,33,168,0.22) 0%, transparent 65%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: "fixed", bottom: 0, right: "-10%",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(15,118,110,0.14) 0%, transparent 65%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth, margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
        {children}
      </div>
    </div>
  );
}

/** Kart bileşeni */
export function SacredCard({ children, className = "", glow = false, style }: { children: ReactNode; className?: string; glow?: boolean; style?: CSSProperties }) {
  const glowStyle: CSSProperties = glow ? { boxShadow: "0 0 40px var(--gold-glow), 0 24px 60px rgba(0,0,0,0.5)" } : {};
  return (
    <div
      className={`sacred-card ${className}`}
      style={{ ...glowStyle, ...style }}
    >
      {children}
    </div>
  );
}

/** Sayfa başlığı */
export function SacredHeading({ label, title, subtitle }: { label?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      {label && (
        <p style={{ fontSize: "0.68rem", letterSpacing: "0.4em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
          ✦ {label} ✦
        </p>
      )}
      <h1 className="font-sacred" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
        {title}
      </h1>
      {subtitle && <p style={{ fontSize: "0.9rem", color: "rgba(237,232,220,0.55)", lineHeight: 1.7 }}>{subtitle}</p>}
    </div>
  );
}

/** Input bileşeni */
export function SacredInput(props: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, ...rest } = props;
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          {label}
        </label>
      )}
      <input
        {...rest}
        style={{
          width: "100%", padding: "0.7rem 0.9rem",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border-gold)",
          borderRadius: "0.6rem",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          ...rest.style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "rgba(201,162,39,0.7)";
          e.target.style.boxShadow = "0 0 16px var(--gold-glow)";
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border-gold)";
          e.target.style.boxShadow = "none";
          rest.onBlur?.(e);
        }}
      />
    </div>
  );
}

/** Select bileşeni */
export function SacredSelect(props: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, children, ...rest } = props;
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          {label}
        </label>
      )}
      <select
        {...rest}
        style={{
          width: "100%", padding: "0.7rem 0.9rem",
          background: "rgba(8,4,18,0.9)",
          border: "1px solid var(--border-gold)",
          borderRadius: "0.6rem",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {children}
      </select>
    </div>
  );
}

/** Hata/bilgi mesajı */
export function SacredAlert({ text, tone = "error" }: { text: string; tone?: "error" | "success" | "info" }) {
  const colors = {
    error:   { border: "rgba(239,68,68,0.35)",  bg: "rgba(239,68,68,0.08)",  text: "#fca5a5" },
    success: { border: "rgba(201,162,39,0.4)",  bg: "rgba(201,162,39,0.06)", text: "var(--gold-light)" },
    info:    { border: "rgba(168,85,247,0.35)", bg: "rgba(168,85,247,0.06)", text: "#c4b5fd" },
  }[tone];
  return (
    <div style={{
      padding: "0.7rem 1rem",
      borderRadius: "0.6rem",
      border: `1px solid ${colors.border}`,
      background: colors.bg,
      color: colors.text,
      fontSize: "0.83rem",
      lineHeight: 1.6,
    }}>
      {text}
    </div>
  );
}

/** Bölücü */
export function SacredDivider({ label }: { label?: string }) {
  if (!label) return <div style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold), transparent)", margin: "1.5rem 0" }} />;
  return (
    <div className="sacred-divider" style={{ margin: "1.5rem 0", fontSize: "0.65rem" }}>
      {label}
    </div>
  );
}

/** XP Bar bileşeni */
export function XPBar({ current, max, label }: { current: number; max: number; label?: string }) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</span>
          <span style={{ fontSize: "0.68rem", color: "var(--gold)" }}>{current} / {max} XP</span>
        </div>
      )}
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Stat kutusu */
export function StatBox({ value, label, icon }: { value: string | number; label: string; icon?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(201,162,39,0.14)",
      borderRadius: "0.75rem",
      padding: "1rem",
      textAlign: "center",
    }}>
      {icon && <div style={{ fontSize: "1.1rem", marginBottom: "0.3rem", color: "var(--gold)" }}>{icon}</div>}
      <div className="font-sacred" style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
    </div>
  );
}
