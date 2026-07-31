export const VISUAL_THEME_STORAGE_KEY = "joinai:visual-theme";
export const VISUAL_THEME_COOKIE_KEY = "joinai_visual_theme";

export const VISUAL_THEMES = [
  { id: "cosmos", label: "Cosmos", swatches: ["#c9a227", "#6b21a8", "#14b8a6"] },
  { id: "aurora", label: "Aurora", swatches: ["#f2b84b", "#d946ef", "#2dd4bf"] },
  { id: "ocean", label: "Ocean", swatches: ["#75d5ff", "#2563eb", "#22d3ee"] },
  { id: "ember", label: "Ember", swatches: ["#ffbe55", "#b83b5e", "#7fb069"] },
] as const;

export type VisualTheme = (typeof VISUAL_THEMES)[number]["id"];

export function isVisualTheme(value: unknown): value is VisualTheme {
  return VISUAL_THEMES.some((theme) => theme.id === value);
}

export function resolveVisualTheme(value: unknown): VisualTheme {
  return isVisualTheme(value) ? value : "cosmos";
}
