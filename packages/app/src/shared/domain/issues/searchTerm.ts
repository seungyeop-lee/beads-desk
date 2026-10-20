/**
 * 이슈 본문과 댓글 검색에서 검색어와 맞는 곳을 찾는 정규식입니다. 검색어 전체를 한 덩어리의 글자 그대로 보고 대소문자를 무시합니다.
 * 서버가 맞은 이슈와 발췌를 고를 때와 화면이 발췌 안의 검색어를 강조할 때 같은 곳이 맞도록, 두 쪽 모두 이 파일의 함수로 찾습니다.
 */
export function searchTermPattern(term: string): RegExp {
  return new RegExp(escapeRegExp(term), "iu");
}

export type SearchTermPart = { text: string; matched: boolean };

/** text를 앞에서부터 검색어와 맞는 조각과 맞지 않는 조각으로 나눕니다. 빈 조각은 담지 않고, 검색어가 비어 있으면 text 전체를 맞지 않는 조각 하나로 돌려줍니다. */
export function splitBySearchTerm(text: string, term: string): SearchTermPart[] {
  if (term === "") return [{ text, matched: false }];
  // 검색어를 capture group으로 감싸 split하면 홀수 번째 조각이 맞은 부분입니다.
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "iu"));
  return parts.flatMap((part, index) =>
    part === "" ? [] : [{ text: part, matched: index % 2 === 1 }],
  );
}

// Node 22에는 RegExp.escape가 없습니다.
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
