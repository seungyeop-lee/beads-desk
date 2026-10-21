/**
 * 컴포넌트 테스트가 Milkdown(Crepe) 편집기에서 요소를 찾는 selector입니다.
 * Milkdown이 정한 class와 속성이라서, Milkdown을 올린 뒤 테스트가 요소를 찾지 못하면 이 파일만 고칩니다.
 */
export const milkdownDom = {
  codeBlock: ".milkdown-code-block",
  /** 코드 블록 아래의 미리보기 영역입니다. 그릴 수 없는 코드 블록에는 없습니다. */
  previewPanel: ".preview-panel",
  preview: ".preview",
  /** 미리보기에 그린 Mermaid 그림입니다. */
  previewDiagram: ".preview svg",
  toolbarLinkButton: '[data-toolbar-item="link"]',
  linkEditButton: ".link-edit-button",
  linkInput: ".link-edit input",
  linkConfirmButton: ".link-edit .confirm",
  /** 링크 미리보기 도구에 보이는 주소입니다. */
  linkPreviewAddress: ".link-preview .link-display",
  linkPreviewIcon: ".link-preview .link-icon",
};
