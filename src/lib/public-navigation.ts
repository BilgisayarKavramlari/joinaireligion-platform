export type FooterSessionState = "authenticated" | "anonymous" | "loading" | "error";

type FooterLabels = {
  pricing: string;
  donate: string;
  promptGuide: string;
  updates: string;
  account: string;
  login: string;
  register: string;
};

export function buildLandingFooterLinks(
  labels: FooterLabels,
  sessionState: FooterSessionState,
): Array<[string, string]> {
  const common: Array<[string, string]> = [
    [labels.pricing, "/pricing"],
    [labels.donate, "/donate"],
    [labels.promptGuide, "/prompt-guide"],
    [labels.updates, "/updates"],
  ];

  if (sessionState === "authenticated") return [...common, [labels.account, "/account"]];
  if (sessionState === "anonymous") {
    return [...common, [labels.login, "/login"], [labels.register, "/register"]];
  }
  return common;
}
