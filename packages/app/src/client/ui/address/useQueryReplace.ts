import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type QueryReplaceOptions = {
  /** pathname을 붙이지 않고 query만(`?...`)으로 주소를 바꿉니다. 화면 안의 dialog가 주소로 열리고 닫힐 때 씁니다. */
  queryOnly?: boolean;
};

/**
 * 지금 주소의 query를 고쳐 router.replace로 주소를 바꿉니다.
 * query가 비었을 때 `?`만 남은 주소를 만들지 않으려고 pathname으로 바꿉니다.
 */
export function useQueryReplace({ queryOnly = false }: QueryReplaceOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams);
      mutate(params);
      const query = params.toString();
      router.replace(queryOnly || query ? `?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, queryOnly],
  );
}
