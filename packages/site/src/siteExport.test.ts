import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

const SITE_DIR = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(SITE_DIR, "out");
const SITE_URL = "https://beads-desk.seungyeop-lee.com";

const LOCALES = [
  {
    locale: "en",
    htmlPath: "index.html",
    canonicalUrl: `${SITE_URL}/`,
    ogLocale: "en_US",
    ogImageUrl: `${SITE_URL}/og/en.png`,
  },
  {
    locale: "ko",
    htmlPath: "ko/index.html",
    canonicalUrl: `${SITE_URL}/ko/`,
    ogLocale: "ko_KR",
    ogImageUrl: `${SITE_URL}/og/ko.png`,
  },
  {
    locale: "ja",
    htmlPath: "ja/index.html",
    canonicalUrl: `${SITE_URL}/ja/`,
    ogLocale: "ja_JP",
    ogImageUrl: `${SITE_URL}/og/ja.png`,
  },
] as const;

const FEATURE_SECTION_IDS = [
  "issues",
  "now-bottlenecks",
  "graph",
  "attachments-diff",
  "decisions",
  "needs-human",
  "activity",
  "hygiene",
] as const;

const SCREENSHOT_FILES = [
  "activity.png",
  "attachments.png",
  "decisions.png",
  "diff.png",
  "graph.png",
  "hygiene.png",
  "issues.png",
  "needs-human.png",
  "now.png",
] as const;

function readOutFile(relativePath: string): string {
  return fs.readFileSync(path.join(OUT_DIR, relativePath), "utf8");
}

function readPngDimensions(relativePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(path.join(OUT_DIR, relativePath));
  expect(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function extractMetaContent(html: string, attrName: "name" | "property", key: string): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrMatch = tag.match(new RegExp(`${attrName}="([^"]*)"`, "i"));
    if (attrMatch?.[1] === key) {
      const contentMatch = tag.match(/content="([^"]*)"/i);
      return contentMatch?.[1] ?? "";
    }
  }
  return "";
}

describe("정적 랜딩 사이트 export 검증", () => {
  beforeAll(() => {
    execSync("pnpm run build", { cwd: SITE_DIR, stdio: "pipe" });
  }, 60_000);

  test("세 언어 페이지와 SEO·아이콘·OG 이미지 및 미디어 자산을 모두 생성한다", () => {
    const expectedFiles = [
      "index.html",
      "ko/index.html",
      "ja/index.html",
      "sitemap.xml",
      "robots.txt",
      "icon.svg",
      "icon.png",
      "apple-icon.png",
      "og/en.png",
      "og/ko.png",
      "og/ja.png",
      "media/beads-desk-intro.mp4",
      ...SCREENSHOT_FILES.map((file) => `media/screenshots/${file}`),
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(OUT_DIR, file)), `${file} 생성 여부`).toBe(true);
    }

    for (const { locale } of LOCALES) {
      expect(readPngDimensions(`og/${locale}.png`)).toEqual({ width: 1200, height: 630 });
    }
    expect(readPngDimensions("apple-icon.png")).toEqual({ width: 180, height: 180 });
    expect(readPngDimensions("icon.png")).toEqual({ width: 96, height: 96 });
  });

  test("언어별 HTML은 고유 title, 공유용 og:title, description, canonical, hreflang, OG 이미지, 아이콘, JSON-LD를 포함한다", () => {
    const titles = new Set<string>();
    const ogTitles = new Set<string>();
    const descriptions = new Set<string>();
    const ogImageAlts = new Set<string>();

    for (const { locale, htmlPath, canonicalUrl, ogLocale, ogImageUrl } of LOCALES) {
      const html = readOutFile(htmlPath);

      const langMatch = html.match(/<html[^>]*\blang="([^"]+)"/i);
      expect(langMatch?.[1]).toBe(locale);

      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch?.[1] ?? "";
      expect(title.length).toBeGreaterThan(10);
      titles.add(title);

      const description = extractMetaContent(html, "name", "description");
      expect(description.length).toBeGreaterThan(30);
      descriptions.add(description);

      expect(html).toContain(`<link rel="canonical" href="${canonicalUrl}"`);
      expect(html).toContain(`<link rel="alternate" hrefLang="en" href="${SITE_URL}/"`);
      expect(html).toContain(`<link rel="alternate" hrefLang="ko" href="${SITE_URL}/ko/"`);
      expect(html).toContain(`<link rel="alternate" hrefLang="ja" href="${SITE_URL}/ja/"`);
      expect(html).toContain(`<link rel="alternate" hrefLang="x-default" href="${SITE_URL}/"`);

      const ogTitle = extractMetaContent(html, "property", "og:title");
      expect(ogTitle.length).toBeGreaterThan(10);
      expect(ogTitle.length).toBeLessThanOrEqual(45);
      ogTitles.add(ogTitle);

      expect(extractMetaContent(html, "property", "og:description")).toBe(description);
      expect(extractMetaContent(html, "property", "og:url")).toBe(canonicalUrl);
      expect(extractMetaContent(html, "property", "og:locale")).toBe(ogLocale);
      expect(extractMetaContent(html, "property", "og:image")).toBe(ogImageUrl);
      expect(extractMetaContent(html, "property", "og:image:type")).toBe("image/png");
      expect(extractMetaContent(html, "property", "og:image:width")).toBe("1200");
      expect(extractMetaContent(html, "property", "og:image:height")).toBe("630");

      const ogImageAlt = extractMetaContent(html, "property", "og:image:alt");
      expect(ogImageAlt.length).toBeGreaterThan(10);
      ogImageAlts.add(ogImageAlt);

      expect(extractMetaContent(html, "name", "twitter:card")).toBe("summary_large_image");
      expect(extractMetaContent(html, "name", "twitter:title")).toBe(ogTitle);
      expect(extractMetaContent(html, "name", "twitter:description")).toBe(description);
      expect(extractMetaContent(html, "name", "twitter:image")).toBe(ogImageUrl);
      expect(extractMetaContent(html, "name", "twitter:image:alt")).toBe(ogImageAlt);

      const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
      expect(
        linkTags.some((tag) => /\brel="icon"/i.test(tag) && /\btype="image\/svg\+xml"/i.test(tag)),
      ).toBe(true);
      expect(
        linkTags.some(
          (tag) =>
            /\brel="icon"/i.test(tag) &&
            /\btype="image\/png"/i.test(tag) &&
            /\bsizes="96x96"/i.test(tag),
        ),
      ).toBe(true);
      expect(
        linkTags.some(
          (tag) =>
            /\brel="apple-touch-icon"/i.test(tag) &&
            /\btype="image\/png"/i.test(tag) &&
            /\bsizes="180x180"/i.test(tag),
        ),
      ).toBe(true);

      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
      expect(jsonLdMatch).not.toBeNull();
      const jsonLd = JSON.parse(jsonLdMatch![1]!) as Record<string, unknown>;
      expect(jsonLd["@type"]).toBe("SoftwareApplication");
      expect(jsonLd.name).toBe("beads-desk");
      expect(jsonLd.url).toBe(canonicalUrl);
      expect(jsonLd.inLanguage).toBe(locale);
      expect(jsonLd.image).toBe(ogImageUrl);
      expect(jsonLd.screenshot).toBe(`${SITE_URL}/media/screenshots/now.png`);
    }

    expect(titles.size).toBe(3);
    expect(ogTitles.size).toBe(3);
    expect(descriptions.size).toBe(3);
    expect(ogImageAlts.size).toBe(3);
  });

  test("시맨틱 구조, 핵심 기능 9종, 빠른 시작 명령, 정책 제약을 지킨다", () => {
    for (const { htmlPath } of LOCALES) {
      const html = readOutFile(htmlPath);

      const h1Matches = html.match(/<h1\b/gi) ?? [];
      expect(h1Matches).toHaveLength(1);

      const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
      expect(imgTags.length).toBeGreaterThanOrEqual(9);
      for (const imgTag of imgTags) {
        expect(imgTag).toMatch(/\balt="[^"]+"/i);
      }

      for (const id of FEATURE_SECTION_IDS) {
        expect(html).toContain(`id="${id}"`);
      }

      expect(html).toContain("npm install -g @seungyeop-lee/beads-desk");
      expect(html).toContain("bd-desk start --open");
      expect(html).toContain("https://github.com/seungyeop-lee/beads-desk");
      expect(html).toContain("https://www.npmjs.com/package/@seungyeop-lee/beads-desk");
      expect(html).toContain("/media/beads-desk-intro.mp4");

      const videoTag = html.match(/<video\b[^>]*>/i)?.[0] ?? "";
      expect(videoTag).not.toBe("");
      expect(videoTag).toMatch(/\bautoplay\b/i);
      expect(videoTag).toMatch(/\bloop\b/i);
      expect(videoTag).toMatch(/\bmuted\b/i);
      expect(videoTag).toMatch(/\bplaysinline\b/i);
      expect(videoTag).not.toMatch(/\bcontrols\b/i);

      expect(html).toMatch(/<details\b[^>]*class="[^"]*lang-dropdown/i);
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/ko/"');
      expect(html).toContain('href="/ja/"');

      expect(html).not.toMatch(/beads-starter|\bbds-/i);
    }

    expect(readOutFile("index.html")).toContain("pull requests are not accepted");
    expect(readOutFile("ko/index.html")).toContain("pull request는 받지 않습니다");
    expect(readOutFile("ja/index.html")).toContain("pull request は受け付けていません");
  });

  test("sitemap.xml과 robots.txt가 다국어 정적 경로와 사이트맵 주소를 올바르게 가리킨다", () => {
    const sitemap = readOutFile("sitemap.xml");
    expect(sitemap).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(sitemap).toContain(`<loc>${SITE_URL}/ko/</loc>`);
    expect(sitemap).toContain(`<loc>${SITE_URL}/ja/</loc>`);
    expect(sitemap).toContain(`hreflang="en" href="${SITE_URL}/"`);
    expect(sitemap).toContain(`hreflang="ko" href="${SITE_URL}/ko/"`);
    expect(sitemap).toContain(`hreflang="ja" href="${SITE_URL}/ja/"`);
    expect(sitemap).toContain(`hreflang="x-default" href="${SITE_URL}/"`);

    const robots = readOutFile("robots.txt");
    expect(robots).toContain("User-Agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  test("루트(/) HTML에만 초기 언어 리다이렉트 인라인 스크립트가 포함된다", () => {
    const enHtml = readOutFile("index.html");
    const enHead = enHtml.slice(0, enHtml.indexOf("</head>"));
    expect(enHead).toContain("beads-desk.site-locale");
    expect(enHead).toContain("window.location.replace");

    expect(readOutFile("ko/index.html")).not.toContain("beads-desk.site-locale");
    expect(readOutFile("ja/index.html")).not.toContain("beads-desk.site-locale");
  });

  test("빌드 CSS에 일본어(lang=ja) 전용 일본어 글꼴 우선 규칙이 포함된다", () => {
    const chunksDir = path.join(OUT_DIR, "_next/static/chunks");
    const cssFiles = fs.readdirSync(chunksDir).filter((file) => file.endsWith(".css"));
    expect(cssFiles.length).toBeGreaterThan(0);

    const css = cssFiles
      .map((file) => fs.readFileSync(path.join(chunksDir, file), "utf8"))
      .join("\n");
    const jaRuleMatch = css.match(/html:lang\(ja\),\[lang=["']?ja["']?\]\{([^}]+)\}/);
    expect(jaRuleMatch).not.toBeNull();
    const jaRuleBody = jaRuleMatch![1]!;
    expect(jaRuleBody).toContain("Hiragino Sans");
    expect(jaRuleBody).not.toContain("Pretendard");
    expect(jaRuleBody).not.toContain("Apple SD Gothic Neo");
    expect(jaRuleBody).not.toContain("Noto Sans KR");
  });
});
