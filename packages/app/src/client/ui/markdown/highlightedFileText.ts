import { type Language, LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightCode } from "@lezer/highlight";
import { StyleModule } from "style-mod";
import type { FilePreviewFormat } from "@/client/modules/markdown/domain/filePreview";
import { filePreviewHighlightStyle } from "./codeHighlighting";

/** 원문을 형식의 language mode로 토큰으로 나눠, 토큰마다 코드 블록과 같은 강조 규칙(codeHighlighting.ts)의 class를 붙입니다. */
export async function highlightedFileText(
  text: string,
  format: Exclude<FilePreviewFormat, "plain">,
): Promise<DocumentFragment> {
  const mode = format === "diff" ? await diffMode() : await markdownMode(text);
  StyleModule.mount(document, filePreviewHighlightStyle.module!);
  const fragment = document.createDocumentFragment();
  highlightCode(
    text,
    mode.parser.parse(text),
    filePreviewHighlightStyle,
    (part, classes) => {
      if (!classes) return fragment.append(part);
      const token = document.createElement("span");
      token.className = classes;
      token.textContent = part;
      fragment.append(token);
    },
    () => fragment.append("\n"),
  );
  return fragment;
}

/** 코드 블록과 같은 @codemirror/language-data의 diff mode입니다. */
async function diffMode(): Promise<Language> {
  const diff = await LanguageDescription.matchLanguageName(languages, "diff")!.load();
  return diff.language;
}

/**
 * GFM markdown mode입니다. 코드 블록(```ts 등)은 본문 코드 블록처럼 @codemirror/language-data의 그 언어 mode로 나눕니다.
 * 언어 mode는 불러오기 전에는 그 코드 블록을 나누지 않고 건너뛰므로, 원문을 한 번 나눠 코드 블록이 쓰는 언어를 모두 불러온 뒤에 돌려줍니다.
 */
async function markdownMode(text: string): Promise<Language> {
  const { markdown, markdownLanguage } = await import("@codemirror/lang-markdown");
  const used = new Set<LanguageDescription>();
  const { language } = markdown({
    base: markdownLanguage,
    codeLanguages: (info) => {
      const description = LanguageDescription.matchLanguageName(languages, info, true);
      if (description) used.add(description);
      return description;
    },
  });
  language.parser.parse(text);
  await Promise.allSettled([...used].map((description) => description.load()));
  return language;
}
