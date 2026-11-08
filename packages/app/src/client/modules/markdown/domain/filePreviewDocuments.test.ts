import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, test } from "vitest";
import { localFileUrl } from "@/shared/contract/localFiles";
import { filePreviewFormat, filePreviewFormats, type FilePreviewFormat } from "./filePreview";
import {
  assertDocumentDeclaration,
  declarationText,
  documentDeclarations,
} from "./filePreviewDocuments.testkit";

const REPO_ROOT = new URL("../../../../../../../", import.meta.url);
const documents = new Map(
  [...new Set(documentDeclarations.map(({ path }) => path))].map((path) => [
    path,
    readFileSync(new URL(path, REPO_ROOT), "utf8"),
  ]),
);

test("열거한 생산 형식은 기존 대소문자 판정과 일치하고 판정 데이터를 노출하지 않는다", () => {
  for (const [extension, format] of filePreviewFormats()) {
    expect(filePreviewFormat(localFileUrl(`/tmp/a.${extension.toUpperCase()}`, "demo"))).toBe(
      format,
    );
  }
  const first = filePreviewFormats().next().value!;
  const original = [...first];
  Object.assign(first, { 0: "unsupported", 1: "plain" });
  expect([...filePreviewFormats()][0]).toEqual(original);
});

test.each(documentDeclarations)("$path $feature 지원 선언은 생산 형식과 같다", (declaration) => {
  expect(() =>
    assertDocumentDeclaration(documents.get(declaration.path)!, declaration, filePreviewFormats()),
  ).not.toThrow();
});

test.each(documentDeclarations)(
  "$path $feature 선언이 빠진 새 생산 형식은 실패한다",
  (declaration) => {
    const format: FilePreviewFormat = declaration.feature === "diff" ? "diff" : "plain";
    const formats = [...filePreviewFormats(), ["audit", format] as const];
    expect(() =>
      assertDocumentDeclaration(documents.get(declaration.path)!, declaration, formats),
    ).toThrow(/생산 형식과 문서 집합/);
  },
);

const mutations = [
  ["확장자 누락", (text: string) => text.replace(/`\.[a-z0-9]+`/i, "")],
  ["미지원 추가", (text: string) => `${text} \`.yaml\``],
  ["빈 목록", (text: string) => text.replace(/`\.[a-z0-9]+`/gi, "")],
] as const;

for (const [name, mutate] of mutations) {
  test.each(documentDeclarations)(`$path $feature ${name}은 실패한다`, (declaration) => {
    const document = documents.get(declaration.path)!;
    const text = declarationText(document, declaration);
    expect(() =>
      assertDocumentDeclaration(
        document.replace(text, mutate(text)),
        declaration,
        filePreviewFormats(),
      ),
    ).toThrow(/생산 형식과 문서 집합|비어 있지 않은 확장자 선언/);
  });
}

test.each(documentDeclarations.filter(({ feature }) => feature !== "expand"))(
  "$path $feature 다른 viewer의 형식은 실패한다",
  (declaration) => {
    const document = documents.get(declaration.path)!;
    const text = declarationText(document, declaration);
    const wrong = declaration.feature === "diff" ? "`.md`" : "`.patch`";
    expect(() =>
      assertDocumentDeclaration(
        document.replace(text, text.replace(/`\.[a-z0-9]+`/i, wrong)),
        declaration,
        filePreviewFormats(),
      ),
    ).toThrow(/생산 형식과 문서 집합/);
  },
);

test.each(documentDeclarations)("$path $feature 대상 절 소실은 실패한다", (declaration) => {
  const document = documents.get(declaration.path)!;
  expect(() =>
    assertDocumentDeclaration(
      document.replace(`### ${declaration.heading}`, "### 다른 절"),
      declaration,
      filePreviewFormats(),
    ),
  ).toThrow(/대상 절/);
});

test.each(documentDeclarations)("$path $feature 지원 선언 소실은 실패한다", (declaration) => {
  const document = documents.get(declaration.path)!;
  const text = declarationText(document, declaration);
  expect(() =>
    assertDocumentDeclaration(document.replace(text, ""), declaration, filePreviewFormats()),
  ).toThrow(/화면 링크 선언|비어 있지 않은 확장자 선언|첫 지원 선언/);
});

test.each(documentDeclarations.filter(({ group }) => group))(
  "$path $feature 선언 그룹 소실은 실패한다",
  (declaration) => {
    const document = documents.get(declaration.path)!;
    expect(() =>
      assertDocumentDeclaration(
        document.replace(
          `### ${declaration.heading}\n\n- ${declaration.group}:`,
          `### ${declaration.heading}\n\n- 다른 그룹:`,
        ),
        declaration,
        filePreviewFormats(),
      ),
    ).toThrow(/선언 그룹/);
  },
);

test.each(documentDeclarations)(
  "$path $feature 순서와 주변 문구 편집은 통과한다",
  (declaration) => {
    const document = documents.get(declaration.path)!;
    const text = declarationText(document, declaration);
    const extensions = [...text.matchAll(/`\.[a-z0-9]+`/gi)].map(([span]) => span).reverse();
    const reordered = text.replace(/`\.[a-z0-9]+`/gi, () => extensions.shift()!);
    const edited = reordered.replace(/^- |^ {2}- /, "$&주변 설명을 고쳐도: ");
    expect(() =>
      assertDocumentDeclaration(document.replace(text, edited), declaration, filePreviewFormats()),
    ).not.toThrow();
  },
);
