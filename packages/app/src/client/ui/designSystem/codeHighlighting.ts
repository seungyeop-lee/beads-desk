import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/**
 * 코드 블록의 구문 강조입니다. CodeMirror 기본 강조(defaultHighlightStyle)와 같은 토큰을 같은 모양으로 칠하되,
 * 색은 markdownEditor.css의 --code-* 변수로 정합니다. 변수 값이 테마를 따라 바뀌므로, 테마를 바꿔도 편집기를 다시 만들거나 설정을 바꾸지 않습니다.
 * fallback이 아닌 강조가 하나라도 있으면 CodeMirror는 basicSetup이 fallback으로 넣은 기본 강조를 적용하지 않습니다.
 */
export const codeHighlighting = syntaxHighlighting(
  HighlightStyle.define([
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
  ]),
);

/**
 * 코드 블록에서 커서가 있는 줄과 고른 글자의 바탕입니다. CodeMirror 기본 테마는 dark theme 확장이 없으면 밝은 바탕에 맞춘 색을 쓰므로,
 * 색을 markdownEditor.css의 --code-* 변수로 바꿉니다. EditorView.theme의 규칙은 기본 테마의 같은 규칙보다 우선합니다.
 */
export const codeSelectionTheme = EditorView.theme({
  ".cm-activeLine": { backgroundColor: "var(--code-active-line)" },
  ".cm-selectionBackground": { background: "var(--code-selection-unfocused)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "var(--code-selection)",
  },
});
