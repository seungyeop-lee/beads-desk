import vm from "node:vm";
import { describe, expect, test, vi } from "vitest";

import {
  SITE_LOCALE_STORAGE_KEY,
  buildRootLocaleRedirectScript,
  resolvePreferredSiteLocale,
} from "./localePreference";

describe("resolvePreferredSiteLocale", () => {
  test.each([
    [["ko-KR"], "ko"],
    [["ja-JP"], "ja"],
    [["en-US"], "en"],
    [["fr"], "en"],
    [["en-US", "ko"], "en"],
    [["fr", "ko-KR"], "ko"],
    [["fr-FR", "ja-JP", "ko-KR"], "ja"],
    [["", "  ", "KO-kr"], "ko"],
    [[], "en"],
  ])("저장된 언어가 없을 때 브라우저 언어 %j를 %s로 판별한다", (languages, expected) => {
    expect(resolvePreferredSiteLocale(null, languages)).toBe(expected);
  });

  test("저장된 언어가 유효하면 브라우저 언어보다 우선한다", () => {
    expect(resolvePreferredSiteLocale("en", ["ko-KR"])).toBe("en");
    expect(resolvePreferredSiteLocale("ko", ["en-US"])).toBe("ko");
    expect(resolvePreferredSiteLocale("ja", ["en-US"])).toBe("ja");
  });

  test("저장된 값이 지원하지 않는 언어이면 브라우저 언어로 판별한다", () => {
    expect(resolvePreferredSiteLocale("fr", ["ko-KR"])).toBe("ko");
    expect(resolvePreferredSiteLocale("", ["ja-JP"])).toBe("ja");
  });
});

function runInlineRedirectScript(options: {
  pathname: string;
  search?: string;
  hash?: string;
  languages?: readonly string[];
  language?: string;
  storedLocale?: string | null;
  throwStorage?: boolean;
}) {
  const replace = vi.fn<(url: string) => void>();
  const script = buildRootLocaleRedirectScript();
  const context = {
    window: {
      location: {
        pathname: options.pathname,
        search: options.search ?? "",
        hash: options.hash ?? "",
        replace,
      },
      localStorage: {
        getItem: (key: string) => {
          if (options.throwStorage) throw new Error("storage blocked");
          return key === SITE_LOCALE_STORAGE_KEY ? (options.storedLocale ?? null) : null;
        },
      },
    },
    navigator: {
      languages: options.languages ?? [],
      language: options.language ?? "",
    },
  };

  vm.runInNewContext(script, context);
  return { replace };
}

describe("buildRootLocaleRedirectScript", () => {
  test("루트(/)에서 저장값이 없고 한국어 브라우저이면 query와 hash를 유지해 /ko/로 이동한다", () => {
    const { replace } = runInlineRedirectScript({
      pathname: "/",
      search: "?utm=test",
      hash: "#install",
      languages: ["ko-KR", "en-US"],
    });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/ko/?utm=test#install");
  });

  test("navigator.languages가 비어 있으면 navigator.language를 사용해 이동한다", () => {
    const { replace } = runInlineRedirectScript({
      pathname: "/",
      languages: [],
      language: "ja-JP",
    });

    expect(replace).toHaveBeenCalledWith("/ja/");
  });

  test("저장된 선택이 en이면 한국어 브라우저여도 루트(/)에 머무른다", () => {
    const { replace } = runInlineRedirectScript({
      pathname: "/",
      languages: ["ko-KR"],
      storedLocale: "en",
    });

    expect(replace).not.toHaveBeenCalled();
  });

  test("localStorage 접근이 예외를 던져도 브라우저 언어로 정상 판별한다", () => {
    const { replace } = runInlineRedirectScript({
      pathname: "/",
      languages: ["ko-KR"],
      throwStorage: true,
    });

    expect(replace).toHaveBeenCalledWith("/ko/");
  });

  test("루트가 아닌 경로에서는 저장값이나 브라우저 언어와 무관하게 이동하지 않는다", () => {
    const { replace } = runInlineRedirectScript({
      pathname: "/ko/",
      languages: ["ja-JP"],
      storedLocale: "en",
    });

    expect(replace).not.toHaveBeenCalled();
  });
});
