/**
 * 컴포넌트 테스트가 코드 블록의 CodeMirror 편집기에서 요소를 찾는 selector입니다.
 * CodeMirror가 정한 class라서, CodeMirror를 올린 뒤 테스트가 요소를 찾지 못하면 이 파일만 고칩니다.
 */
export const codeMirrorDom = {
  editor: ".cm-editor",
  content: ".cm-content",
  /** 코드 줄에 놓인 강조 토큰입니다. */
  token: ".cm-line span",
  activeLine: ".cm-activeLine",
  activeLineToken: ".cm-activeLine span",
  cursor: ".cm-cursor",
  dropCursor: ".cm-dropCursor",
  selection: ".cm-selectionLayer .cm-selectionBackground",
  matchingBracket: ".cm-matchingBracket",
  selectionMatch: ".cm-selectionMatch",
  searchMatch: ".cm-searchMatch:not(.cm-searchMatch-selected)",
  currentSearchMatch: ".cm-searchMatch-selected",
  snippetField: ".cm-snippetField",
  completionList: ".cm-tooltip-autocomplete",
  completionOption: ".cm-tooltip-autocomplete li",
  unselectedCompletionOption: ".cm-tooltip-autocomplete li:not([aria-selected])",
  foldPlaceholder: ".cm-foldPlaceholder",
  panel: ".cm-panel",
  searchPanel: ".cm-search",
  searchCloseButton: ".cm-search [name=close]",
  /** 줄 이동 dialog(Mod-Alt-g)입니다. */
  lineDialog: ".cm-dialog",
  lineDialogGoButton: ".cm-dialog form button.cm-button",
  lineDialogCloseButton: ".cm-dialog-close",
};
