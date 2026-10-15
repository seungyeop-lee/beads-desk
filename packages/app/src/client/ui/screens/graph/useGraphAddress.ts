import { useAddressState } from "@/client/ui/address/useAddressState";
import { graphHref, readGraphAddress, type GraphAddress } from "./graphAddress";

/** 의존 그래프 주소의 탭과 필터를 읽고, 바꾼 조건을 주소에 남깁니다. */
export function useGraphAddress(): {
  address: GraphAddress;
  changeAddress: (changes: Partial<GraphAddress>) => void;
} {
  const [address, setAddress] = useAddressState(readGraphAddress, graphHref);
  return { address, changeAddress: (changes) => setAddress({ ...address, ...changes }) };
}
