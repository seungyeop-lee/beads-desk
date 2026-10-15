import { useAddressState } from "@/client/ui/address/useAddressState";
import { issueListHref, readIssueListAddress, type IssueListAddress } from "./issueListAddress";

/** 이슈 목록 주소의 조건을 읽고, 필터 줄에서 바꾼 조건을 주소에 남깁니다. 보기 탭은 링크로 바꿉니다. */
export function useIssueListAddress(): {
  address: IssueListAddress;
  changeFilters: (filters: Partial<Omit<IssueListAddress, "view">>) => void;
} {
  const [address, setAddress] = useAddressState(readIssueListAddress, issueListHref);
  const changeFilters = (filters: Partial<Omit<IssueListAddress, "view">>) =>
    setAddress({ ...address, ...filters });
  return { address, changeFilters };
}
