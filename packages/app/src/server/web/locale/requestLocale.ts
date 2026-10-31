import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/shared/contract/locale";

/** 화면 문구와 서버 오류 문구를 쓸 언어입니다. layout, Route Handler, Server Action에서 부릅니다. */
export async function requestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("Accept-Language"));
}

/** 고른 언어가 없으면 브라우저가 가장 먼저 원하는 언어를 쓰고, 그 언어를 지원하지 않으면 영어를 씁니다. */
export function pickLocale(chosen: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(chosen)) return chosen;
  const primary = primaryLanguage(acceptLanguage ?? "");
  return isLocale(primary) ? primary : "en";
}

function primaryLanguage(acceptLanguage: string): string | undefined {
  let best: { language: string; quality: number } | undefined;
  for (const entry of acceptLanguage.split(",")) {
    const [tag = "", ...params] = entry.split(";").map((part) => part.trim());
    const qParam = params.find((param) => param.startsWith("q="));
    const quality = qParam ? Number(qParam.slice(2)) : 1;
    if (!tag || !(quality > 0)) continue;
    if (!best || quality > best.quality) {
      best = { language: tag.split("-")[0]!.toLowerCase(), quality };
    }
  }
  return best?.language;
}
