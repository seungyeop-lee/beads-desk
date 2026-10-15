import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { issueListHref, readIssueListAddress, type IssueListAddress } from "./issueListAddress";

/**
 * 이슈 목록 주소의 조건을 읽고, 필터 줄에서 바꾼 조건을 주소에 남깁니다.
 * 주소는 router.replace가 끝난 뒤에야 바뀌므로 바꾼 조건을 먼저 화면에 반영합니다.
 * 주소만 읽어 그리면 체크박스와 날짜 칸이 주소가 바뀔 때까지 이전 값으로 되돌아가고, 연달아 바꾼 값이 앞의 값을 덮어씁니다.
 * 보기 탭, 뒤로 가기, 다른 화면의 링크로 주소가 바뀌면 주소의 조건을 다시 따릅니다.
 */
export function useIssueListAddress(): {
  address: IssueListAddress;
  changeFilters: (filters: Partial<Omit<IssueListAddress, "view">>) => void;
} {
  const router = useRouter();
  const query = useSearchParams().toString();
  const [seenQuery, setSeenQuery] = useState(query);
  const [address, setAddress] = useState(() => readIssueListAddress(new URLSearchParams(query)));
  if (seenQuery !== query) {
    setSeenQuery(query);
    setAddress(readIssueListAddress(new URLSearchParams(query)));
  }

  const changeFilters = (filters: Partial<Omit<IssueListAddress, "view">>) => {
    const changed = { ...address, ...filters };
    setAddress(changed);
    router.replace(issueListHref(changed), { scroll: false });
  };
  return { address, changeFilters };
}
