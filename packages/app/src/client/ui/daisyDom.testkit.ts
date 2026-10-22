/**
 * 컴포넌트 테스트가 daisyUI 구성 요소에서 요소를 찾는 selector입니다.
 * daisyUI가 정한 class라서, daisyUI를 올린 뒤 테스트가 요소를 찾지 못하면 이 파일만 고칩니다.
 */
export const daisyDom = {
  /** dialog.modal 안의 상자로, 열리고 닫힐 때 크기 전환이 지나가는 요소입니다. */
  modalBox: ".modal-box",
  /** dialog.modal 바깥을 눌러 닫는 영역 안의 닫기 단추입니다. */
  modalBackdropButton: ".modal-backdrop button",
};
