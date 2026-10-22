import { HighlightStyle, syntaxHighlighting, type TagStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/**
 * 토큰 종류별 색과 모양입니다. 본문 코드 블록과 펼친 파일 미리보기가 모두 이 목록으로 칠하므로, 한 곳만 고치면 두 곳이 함께 바뀝니다.
 * CodeMirror 기본 강조(defaultHighlightStyle)와 같은 토큰을 같은 모양으로 칠하되, 색은 markdownEditor.css의 --code-* 변수로 정합니다.
 * 변수 값이 테마를 따라 바뀌므로, 테마를 바꿔도 강조를 다시 만들거나 설정을 바꾸지 않습니다.
 */
const codeTokenStyles: TagStyle[] = [
  { tag: tags.meta, color: "var(--code-meta)" },
  { tag: tags.link, textDecoration: "underline" },
  { tag: tags.heading, textDecoration: "underline", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.keyword, color: "var(--code-keyword)" },
  {
    tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName],
    color: "var(--code-atom)",
  },
  { tag: [tags.literal, tags.inserted], color: "var(--code-literal)" },
  { tag: [tags.string, tags.deleted], color: "var(--code-string)" },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: "var(--code-regexp)" },
  { tag: tags.definition(tags.variableName), color: "var(--code-definition)" },
  { tag: tags.local(tags.variableName), color: "var(--code-local)" },
  { tag: [tags.typeName, tags.namespace], color: "var(--code-type)" },
  { tag: tags.className, color: "var(--code-class)" },
  { tag: [tags.special(tags.variableName), tags.macroName], color: "var(--code-special)" },
  { tag: tags.definition(tags.propertyName), color: "var(--code-property)" },
  { tag: tags.comment, color: "var(--code-comment)" },
  { tag: tags.invalid, color: "var(--code-invalid)" },
];

/**
 * 코드 블록의 구문 강조입니다.
 * fallback이 아닌 강조가 하나라도 있으면 CodeMirror는 basicSetup이 fallback으로 넣은 기본 강조를 적용하지 않습니다.
 */
export const codeHighlighting = syntaxHighlighting(HighlightStyle.define(codeTokenStyles));

/**
 * 펼친 파일 미리보기(localFilePreview.ts)의 강조입니다. 코드 블록 강조에 더해, markdown 원문에서 인라인 코드·코드 블록 글자(monospace)와
 * 표시 기호(#, -, *, `, >)를 본문 글자와 구분해 칠합니다. 이 둘은 XML의 `<?xml ?>` 같은 다른 언어 토큰에도 붙으므로 코드 블록에는 넣지 않습니다.
 * 편집기 밖에서 쓰므로, 생성된 class에 규칙이 붙으려면 `module`을 문서에 mount해야 합니다.
 */
export const filePreviewHighlightStyle = HighlightStyle.define([
  ...codeTokenStyles,
  { tag: tags.monospace, color: "var(--code-literal)" },
  { tag: tags.processingInstruction, color: "var(--code-keyword)" },
]);

/**
 * 코드 블록 편집기가 그리는 표시(현재 줄, 고른 글자, caret, 같은 낱말과 검색 결과 강조, 자동 완성 목록, 접힌 코드, snippet 입력 칸, 버튼)의 색입니다.
 * CodeMirror 기본 테마는 dark theme 확장이 없으면 밝은 바탕에 맞춘 색을 쓰므로, 색을 markdownEditor.css의 --code-* 변수로 바꿉니다.
 * EditorView.theme의 규칙은 기본 테마의 같은 규칙보다 우선합니다.
 */
export const codeEditorTheme = EditorView.theme({
  ".cm-activeLine": { backgroundColor: "var(--code-active-line)" },
  ".cm-selectionBackground": { background: "var(--code-selection-unfocused)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "var(--code-selection)",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--code-cursor)" },
  ".cm-selectionMatch": { backgroundColor: "var(--code-selection-match)" },
  ".cm-searchMatch": { backgroundColor: "var(--code-search-match)" },
  ".cm-searchMatch-selected": { backgroundColor: "var(--code-search-match-current)" },
  ".cm-snippetField": { backgroundColor: "var(--code-snippet-field)" },
  ".cm-tooltip": {
    backgroundColor: "var(--code-tooltip)",
    borderColor: "var(--code-tooltip-border)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--code-fold-placeholder)",
    borderColor: "var(--code-fold-placeholder-border)",
    color: "var(--code-fold-placeholder-text)",
  },
  // 버튼 글자색은 정하지 않아 panel 글자색을 물려받습니다. 검색 panel의 버튼은 Crepe 규칙이 바탕을 칠해 이 색을 쓰지 않습니다.
  ".cm-button": {
    backgroundImage: "linear-gradient(var(--code-button-top), var(--code-button-bottom))",
  },
  ".cm-button:active": {
    backgroundImage:
      "linear-gradient(var(--code-button-pressed-top), var(--code-button-pressed-bottom))",
  },
  // Crepe의 `.cm-panel > button` 규칙이 줄 이동 dialog의 닫기 버튼에 테두리와 굵은 글씨를 입힙니다.
  // 검색 panel의 닫기 버튼처럼 그리려고, 그 규칙보다 구체적인 selector로 둘을 되돌립니다.
  "& .cm-panel.cm-dialog > .cm-dialog-close": { border: "none", fontWeight: "inherit" },
});
