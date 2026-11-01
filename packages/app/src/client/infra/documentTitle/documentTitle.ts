/**
 * 탭 제목을 decorate가 원래 제목으로 만든 제목으로 바꿔 둡니다. 돌려준 함수를 호출하면 원래 제목으로 되돌리고 멈춥니다.
 * Next.js는 화면을 이동할 때 metadata로 `<title>`을 다시 쓰므로, head가 바뀔 때마다 지금 제목이 이 함수가 쓴 제목과 다르면
 * 그 제목을 새 원래 제목으로 삼아 다시 바꿉니다. 그래서 화면을 오가도 decorate가 붙인 표시가 사라지거나 두 번 붙지 않습니다.
 */
export function decorateDocumentTitle(decorate: (title: string) => string): () => void {
  let original = document.title;
  let written = original;
  const apply = () => {
    if (document.title !== written) original = document.title;
    written = decorate(original);
    if (document.title !== written) document.title = written;
  };
  const observer = new MutationObserver(apply);
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  apply();
  return () => {
    observer.disconnect();
    if (document.title === written) document.title = original;
  };
}
