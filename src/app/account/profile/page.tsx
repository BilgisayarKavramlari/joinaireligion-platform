"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { SacredPage, SacredCard, SacredHeading, SacredInput, SacredSelect, SacredAlert, SacredDivider, XPBar, StatBox } from "@/components/ui/SacredPage";
import { useLanguage } from "@/contexts/LanguageContext";

const LEVEL_TITLES = ["","Seeker","Awakened","Inquirer","Contemplative","Universal","Hermit","Returned","Bridge","Sovereign","Transcendent"];
const TRADITIONS   = ["Not specified","Christianity","Islam","Judaism","Buddhism","Hinduism","Taoism","Sufism","Hermeticism / Esotericism","Shamanism / Indigenous","Rationalism / Secular","Atheism","Other"];
const COUNTRIES    = ["","Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bangladesh","Belarus","Belgium","Bolivia","Bosnia","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cyprus","Czech Republic","Denmark","Ecuador","Egypt","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Mexico","Moldova","Mongolia","Montenegro","Morocco","Netherlands","New Zealand","Nigeria","North Korea","Norway","Oman","Pakistan","Palestine","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Thailand","Türkiye","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Other"];

interface UserProfile {
  email: string;
  displayName?: string | null;
  currentLevel: number;
  xpTotal: number;
  daysActive: number;
  onboardingDone: boolean;
  unsubscribedAt?: string | null;
  subscription?: { status: string } | null;
  profile?: {
    bio?: string | null;
    tradition?: string | null;
    country?: string | null;
    city?: string | null;
    phone?: string | null;
    secondaryEmail?: string | null;
    avatarPath?: string | null;
    socialMedia?: { twitter?: string; instagram?: string; facebook?: string; linkedin?: string; website?: string } | null;
  } | null;
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const [user,          setUser]          = useState<UserProfile | null>(null);
  const [displayName,   setDisplayName]   = useState("");
  const [tradition,     setTradition]     = useState("Not specified");
  const [bio,           setBio]           = useState("");
  const [country,       setCountry]       = useState("");
  const [city,          setCity]          = useState("");
  const [phone,         setPhone]         = useState("");
  const [secondEmail,   setSecondEmail]   = useState("");
  const [twitter,       setTwitter]       = useState("");
  const [instagram,     setInstagram]     = useState("");
  const [linkedin,      setLinkedin]      = useState("");
  const [website,       setWebsite]       = useState("");
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [msg,           setMsg]           = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((d) => {
      if (!d?.user) return;
      const u: UserProfile = d.user;
      setUser(u);
      setDisplayName(u.displayName || "");
      setTradition(u.profile?.tradition || "Not specified");
      setBio(u.profile?.bio || "");
      setCountry(u.profile?.country || "");
      setCity(u.profile?.city || "");
      setPhone(u.profile?.phone || "");
      setSecondEmail(u.profile?.secondaryEmail || "");
      setTwitter(u.profile?.socialMedia?.twitter || "");
      setInstagram(u.profile?.socialMedia?.instagram || "");
      setLinkedin(u.profile?.socialMedia?.linkedin || "");
      setWebsite(u.profile?.socialMedia?.website || "");
      if (u.profile?.avatarPath) setAvatarUrl(u.profile.avatarPath);
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName.trim() || null,
        tradition: tradition !== "Not specified" ? tradition : null,
        bio: bio.trim() || null,
        country: country || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
        secondaryEmail: secondEmail.trim() || null,
        socialMedia: { twitter: twitter.trim(), instagram: instagram.trim(), linkedin: linkedin.trim(), website: website.trim() },
      }),
    });
    setSaving(false);
    setMsg(res.ok ? { text: "Profile saved successfully.", tone: "success" } : { text: "Failed to save. Please try again.", tone: "error" });
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg({ text: "Image must be under 2MB.", tone: "error" }); return; }
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setMsg({ text: "Only JPG, PNG, and WebP are supported.", tone: "error" }); return; }
    setUploading(true);
    setMsg(null);
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
    const data = await res.json();
    if (res.ok && data.avatarPath) {
      setAvatarUrl(data.avatarPath);
      setMsg({ text: "Profile photo updated.", tone: "success" });
    } else {
      setMsg({ text: data.error || "Upload failed.", tone: "error" });
    }
    setUploading(false);
  }

  const level      = user?.currentLevel || 1;
  const levelTitle = LEVEL_TITLES[level] || "Seeker";
  const xp         = user?.xpTotal || 0;
  const xpForNext  = level * 12 * 80; // rough: 12 lessons × avg 80 XP per level

  return (
    <SacredPage maxWidth={720}>
      <div style={{ marginBottom: "1.2rem" }}>
        <Link href="/account" style={{ fontSize: "0.75rem", color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>← {t.account.dashboard}</Link>
      </div>

      <SacredHeading label="Sacred Profile" title={t.account.profile} subtitle={t.account.profileDesc} />

      {/* Avatar + Level summary */}
      <SacredCard style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid var(--border-gold)", overflow: "hidden", cursor: "pointer", background: "rgba(201,162,39,0.1)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "1.8rem", color: "var(--gold)" }}>
                  {(user?.displayName || user?.email || "?")[0].toUpperCase()}
                </span>
              )}
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                <span style={{ fontSize: "0.7rem", color: "#fff", letterSpacing: "0.05em" }}>Change</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />
            {uploading && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "rotateSacred 0.8s linear infinite" }} /></div>}
            <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.3rem" }}>Max 2MB</p>
          </div>

          {/* Level info */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.3em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "0.2rem" }}>Level {level}</p>
            <p className="font-sacred" style={{ fontSize: "1.4rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: "0.5rem" }}>{levelTitle}</p>
            <XPBar current={xp} max={xpForNext} label={`${xp} XP`} />
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.8rem" }}>
              <StatBox value={user?.daysActive || 0} label={t.account.daysActive} />
              <StatBox value={level} label={t.account.currentLevel} />
              {user?.subscription?.status === "ACTIVE" && <StatBox value="Initiate" label={t.account.membership_label} />}
            </div>
          </div>
        </div>

        {user?.unsubscribedAt && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.78rem", color: "rgba(239,68,68,0.8)" }}>
            ⚠ You are unsubscribed from emails since {new Date(user.unsubscribedAt).toLocaleDateString()}.
            <Link href="/account/preferences" style={{ color: "#c9a227", marginLeft: "0.5rem" }}>Re-subscribe →</Link>
          </div>
        )}
      </SacredCard>

      {msg && <SacredAlert text={msg.text} tone={msg.tone} />}

      {/* Profile form */}
      <form onSubmit={save}>
        <SacredCard style={{ marginBottom: "1.2rem" }}>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "1rem" }}>{t.account.editProfile}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <SacredInput label={t.auth.displayName} type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t.auth.displayNamePlaceholder} />
            <SacredSelect label={t.account.tradition} value={tradition} onChange={(e) => setTradition(e.target.value)}>
              {TRADITIONS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
            </SacredSelect>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "rgba(237,232,220,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.45rem" }}>{t.account.bio}</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few words about your path…" rows={3}
                style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: "0.55rem", border: "1px solid rgba(201,162,39,0.2)", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", fontSize: "0.88rem", lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </SacredCard>

        <SacredCard style={{ marginBottom: "1.2rem" }}>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "1rem" }}>{t.account.city} & {t.account.phone}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <SacredSelect label={t.account.country} value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c || "— Select Country —"}</option>)}
            </SacredSelect>
            <SacredInput label={t.account.city} type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.account.city} />
            <SacredInput label={t.account.phone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            <SacredInput label={t.account.secondaryEmail} type="email" value={secondEmail} onChange={(e) => setSecondEmail(e.target.value)} placeholder="another@email.com" />
          </div>
        </SacredCard>

        <SacredCard style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: "1rem" }}>{t.account.socialMedia}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <SacredInput label={t.account.twitter} type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@handle" />
            <SacredInput label={t.account.instagram} type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@handle" />
            <SacredInput label={t.account.linkedin} type="text" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourname" />
            <SacredInput label={t.account.website} type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
          </div>
        </SacredCard>

        <div style={{ display: "flex", gap: "0.8rem" }}>
          <button type="submit" disabled={saving} className="btn-sacred btn-sacred-gold" style={{ padding: "0.75rem 2rem", fontSize: "0.85rem" }}>
            {saving ? t.common.saving : `✦ ${t.account.saveProfile}`}
          </button>
          <Link href="/account" className="btn-sacred btn-sacred-ghost" style={{ textDecoration: "none", padding: "0.75rem 1.2rem", fontSize: "0.85rem" }}>
            {t.common.cancel}
          </Link>
        </div>
      </form>
    </SacredPage>
  );
}
