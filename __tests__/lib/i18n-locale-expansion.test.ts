import { LANGUAGES, getDict } from "@/lib/i18n/dict";
import { getLandingMessages, normalizeLocale, supportedLocales } from "@/lib/landingContent";
import { locales, resolveLocale } from "@/lib/i18n/translations";

describe("Russian and Simplified Chinese locale expansion", () => {
  test("registers both locales in every public locale registry", () => {
    expect(Object.keys(LANGUAGES)).toEqual(expect.arrayContaining(["ru", "zh"]));
    expect(supportedLocales).toEqual(expect.arrayContaining(["ru", "zh"]));
    expect(locales).toEqual(expect.arrayContaining(["ru", "zh"]));
  });

  test("normalizes browser locale variants", () => {
    expect(normalizeLocale("ru-RU")).toBe("ru");
    expect(resolveLocale("zh-CN")).toBe("zh");
  });

  test("returns localized primary navigation and safety copy", () => {
    expect(getDict("ru").nav.login).toBe("Войти");
    expect(getDict("zh").nav.login).toBe("登录");
    expect(getLandingMessages("ru").hero.warning).toContain("не религия");
    expect(getLandingMessages("zh").hero.warning).toContain("不是宗教");
  });
});
