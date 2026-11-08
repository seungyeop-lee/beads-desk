import { expect } from "vitest";
import type { FilePreviewFormat } from "./filePreview";

type Feature = "diff" | "text" | "expand";
export type DocumentDeclaration = {
  path: string;
  feature: Feature;
  heading: string;
  group?: string;
  link?: string;
};

const languages = [
  {
    suffix: "",
    read: "Read what agents attach",
    diff: "Diff page",
    text: "Text page",
    expand: "Expanding files in an issue",
    opening: "Opening",
    chevron: "Chevron button",
  },
  {
    suffix: ".ko",
    read: "에이전트가 첨부한 자료 읽기",
    diff: "diff 화면",
    text: "텍스트 화면",
    expand: "이슈 화면에서 파일 내용 펼치기",
    opening: "여는 방법",
    chevron: "chevron 버튼",
  },
  {
    suffix: ".ja",
    read: "エージェントが添付した資料を読む",
    diff: "diff 画面",
    text: "テキスト画面",
    expand: "イシュー画面でファイルの内容を展開する",
    opening: "開き方",
    chevron: "chevron ボタン",
  },
];

export const documentDeclarations: DocumentDeclaration[] = languages.flatMap((language) => [
  ...(["text", "diff"] as const).map((feature) => ({
    path: `README${language.suffix}.md`,
    feature,
    heading: language.read,
    link: `USAGE${language.suffix}.md#${language[feature].toLowerCase().replaceAll(" ", "-")}`,
  })),
  ...(["diff", "text", "expand"] as const).map((feature) => ({
    path: `USAGE${language.suffix}.md`,
    feature,
    heading: language[feature],
    group: feature === "expand" ? language.chevron : language.opening,
  })),
]);

// 추출 경계: 지정한 ### 절 안의 README 화면 링크 항목, USAGE의 여는 방법/chevron 그룹 첫 하위 항목입니다.
// 제목·그룹·링크 구조를 옮기면 경계를 함께 갱신합니다. 확장자는 code span으로 선언하며 문구·구두점·순서는 고정하지 않습니다.
// 이 계약은 지원 집합만 비교합니다. 자연어 부정, 번역 의미, 다른 표시 설명이나 미디어 지원은 검증하지 않습니다.
export function declarationText(document: string, declaration: DocumentDeclaration): string {
  const lines = document.split("\n");
  const headings = lines.flatMap((line, index) =>
    line === `### ${declaration.heading}` ? [index] : [],
  );
  const context = `${declaration.path}: ${declaration.feature}`;
  expect(headings, `${context} 대상 절`).toHaveLength(1);
  const start = headings[0]! + 1;
  const end = lines.findIndex((line, index) => index >= start && /^#{1,3} /.test(line));
  const section = lines.slice(start, end === -1 ? undefined : end);
  if (declaration.link) {
    const items = section.join("\n").match(/^- .*(?:\n {2,}\S.*)*/gm) ?? [];
    const matching = items.filter((item) => item.includes(`${declaration.link})`));
    expect(matching, `${context} 화면 링크 선언`).toHaveLength(1);
    return matching[0]!;
  }
  const groups = section.flatMap((line, index) =>
    line === `- ${declaration.group}:` ? [index] : [],
  );
  expect(groups, `${context} 선언 그룹`).toHaveLength(1);
  const groupStart = groups[0]! + 1;
  const groupEnd = section.findIndex((line, index) => index >= groupStart && line.startsWith("- "));
  const group = section.slice(groupStart, groupEnd === -1 ? undefined : groupEnd).join("\n");
  const item = group.match(/^ {2}- .*(?:\n {4,}\S.*)*/m)?.[0];
  expect(item, `${context} 첫 지원 선언`).toBeDefined();
  return item!;
}

export function assertDocumentDeclaration(
  document: string,
  declaration: DocumentDeclaration,
  formats: Iterable<readonly [string, FilePreviewFormat]>,
): void {
  const text = declarationText(document, declaration);
  const declared = new Set(
    [...text.matchAll(/`\.([^`\s]+)`/g)].map((match) => match[1]!.toLowerCase()),
  );
  const context = `${declaration.path}: ${declaration.feature}`;
  expect(declared.size, `${context} 비어 있지 않은 확장자 선언`).toBeGreaterThan(0);
  const supported = new Set(
    [...formats]
      .filter(([, format]) =>
        declaration.feature === "expand"
          ? true
          : declaration.feature === "diff"
            ? format === "diff"
            : format !== "diff",
      )
      .map(([extension]) => extension),
  );
  expect(declared, `${context} 생산 형식과 문서 집합`).toEqual(supported);
}
